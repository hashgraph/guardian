import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormControl, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { PolicyBlock, PolicyTemplate } from '../../structures';
import { RegisteredService } from '../../services/registered.service';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { Subject, takeUntil } from 'rxjs';
import { PolicyEditableField, PolicyEditableFieldDTO } from '@guardian/interfaces';

type PolicyEditableFieldForm = {
  blockTag: FormControl<string>;
  property: FormControl<string>;
  visible: FormControl<string[]>;
  applyTo: FormControl<string[]>;
  required: FormControl<boolean>;
  label: FormControl<string>;
  shortDescription: FormControl<string>;
};

type PolicyForm = {
  fields: FormArray<FormGroup<PolicyEditableFieldForm>>;
};

@Component({
    selector: 'app-parameters-config-dialog',
    templateUrl: './policy-parameters-config-dialog.component.html',
    styleUrls: ['./policy-parameters-config-dialog.component.scss'],
})
export class PolicyParametersConfigDialog implements OnInit {
    @ViewChild('dialogHeader', { static: false }) dialogHeader!: ElementRef<HTMLElement>;
    isLargeSize: boolean = false;
    loading = true;
    submitted = false;
    form: FormGroup<PolicyForm>;
    policyTemplate: PolicyTemplate;
    policyEditableFields: PolicyEditableField[] = [];
    filteredBlocks: Map<string, any[]> = new Map();
    currentBlocks: PolicyBlock[] = [];
    additionalOptionsApplyTo = [
        { _name: 'All' },
        { _name: 'Self' }
    ];

    private _destroy$ = new Subject<void>();
     
    constructor(
        public ref: DynamicDialogRef,
        public config: DynamicDialogConfig,
        private fb: FormBuilder,
        private registeredService: RegisteredService,
        private policyEngineService: PolicyEngineService,
    ) {
        this.policyTemplate = this.config.data.policy;

        this.form = this.fb.group<PolicyForm>({
            fields: this.fb.array(
                this.policyEditableFields.map(m => this.createFieldGroup(m)),
                { validators: [this.duplicateRowsValidator] }
            ),
        });
    }

    ngOnInit() {
        this.loading = false;

        if(this.policyTemplate.editableParametersSettings) {
            this.policyEditableFields = this.policyTemplate.editableParametersSettings?.map(ep => PolicyEditableField.fromDTO(ep));
        }

        this.policyEngineService.getBlockInformation()
            .pipe(takeUntil(this._destroy$))
            .subscribe(blockInfo => {
                this.registeredService.registerConfig(blockInfo);
                this.filterBlocks();
                this.loadData();
            });
    }

    filterBlocks(): void {
        this.currentBlocks = [];
        this.policyTemplate.allBlocks.forEach(block => {
            const props = this.registeredService.getCustomProperties(block.blockType);
            if(props && props.length > 0) {
                const propsWithPath = this.setPath(props.filter((prop: any) => prop.editable), []);
                if(propsWithPath && propsWithPath.length > 0) {
                    this.filteredBlocks.set(block.tag, propsWithPath);
                    this.currentBlocks.push(block);
                }  
            }
        });
    }

    loadData() {
        const fields = this.policyTemplate.editableParametersSettings;
        if(!fields?.length) {
            return;
        }

        fields.forEach((field: PolicyEditableFieldDTO) => {
            if(!this.filteredBlocks.has(field.blockTag)) {
                return;
            }

            const formField: any  = { ...field };
            const g = this.createFieldGroup(formField);
            this.fields.push(g);
        });

        if (this.readonly) {
            this.form.disable({ emitEvent: false });
        }
    }

    trackByIndex = (i: number) => i;

    get fields(): FormArray {
        return this.form.get('fields') as FormArray<FormGroup>;
    }

    get applyToOptions(): any[] {
        return [...this.additionalOptionsApplyTo, ...this.policyTemplate.policyRoles];
    }

    get fieldGroups(): FormGroup<PolicyEditableFieldForm>[] {
        return this.form.controls.fields.controls as FormGroup<PolicyEditableFieldForm>[];
    }

    public propertiesOptions(index: number): any[] {
        return this.policyEditableFields[index]?.properties ?? [];
    }

    // Reject rows whose (blockTag, property, visible) tuple matches another row.
    // Runs at the FormArray level and marks the duplicate rows' inner controls
    // as invalid so the existing is-invalid styling surfaces the error.
    private duplicateRowsValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
        const rows = (control as FormArray<FormGroup<PolicyEditableFieldForm>>).controls ?? [];
        const counts = new Map<string, number>();
        const keys = rows.map(row => this.duplicateRowKey(row));
        keys.forEach(k => k && counts.set(k, (counts.get(k) ?? 0) + 1));

        let hasDuplicate = false;
        rows.forEach((row, i) => {
            const key = keys[i];
            const isDup = !!key && (counts.get(key) ?? 0) > 1;
            if (isDup) {
                hasDuplicate = true;
            }
            for (const name of ['blockTag', 'property', 'visible'] as const) {
                const fc = row.controls[name];
                const errs = { ...(fc.errors ?? {}) };
                if (isDup) {
                    errs.duplicateRow = true;
                } else {
                    delete errs.duplicateRow;
                }
                const next = Object.keys(errs).length ? errs : null;
                if ((next?.duplicateRow ?? null) !== (fc.errors?.duplicateRow ?? null)) {
                    fc.setErrors(next, { emitEvent: false });
                }
            }
        });

        return hasDuplicate ? { duplicateRow: true } : null;
    };

    private duplicateRowKey(row: FormGroup<PolicyEditableFieldForm>): string | null {
        const blockTag = row.controls.blockTag.value;
        const property = row.controls.property.value;
        const visible = [...(row.controls.visible.value ?? [])].sort();
        if (!blockTag || !property || visible.length === 0) {
            return null;
        }
        return `${blockTag}::${property}::${visible.join('|')}`;
    }

    private propertyInCurrentBlock(): ValidatorFn {
        return (control: AbstractControl): ValidationErrors | null => {
            if (!control.parent) return null;

            const propertyValue = control.value;
            if (!propertyValue) return null;

            const blockTag = control.parent.get('blockTag')?.value;
            if (!blockTag) return null;

            const props = this.filteredBlocks.get(blockTag) ?? [];

            return props.some(p => p.path === propertyValue)
            ? null
            : { notInOptions: true };
        };
    }

    private setPath(properties:any[], result:any[], parent?:string) {
        if(!properties) return;

        for(const prop of properties) {
            prop.path = parent ? parent + '.' + prop.name : prop.name;
            if(prop.properties) {
                this.setPath(prop.properties, result, prop.path);
            }
            else {
                result.push(prop);
            }
        }
        return result;
    }

    onBlockChange(selected: any, index: number): void {
        const fg = this.fields.at(index) as FormGroup<PolicyEditableFieldForm>;
        fg.controls.blockTag.setValue(selected);

        this.policyEditableFields[index].properties = this.filteredBlocks.get(selected) ?? [];

        fg.controls.blockTag.markAsDirty();
        fg.controls.blockTag.markAsTouched();
        fg.controls.property.updateValueAndValidity({ emitEvent: false });
    }

    createFieldGroup(m?: Partial<PolicyEditableField>): FormGroup<PolicyEditableFieldForm> {
        const group = this.fb.group<PolicyEditableFieldForm>({
            blockTag: this.fb.control(m?.blockTag ?? '', { nonNullable: true, validators: [Validators.required] }),
            property: this.fb.control(m?.propertyPath ?? '', { nonNullable: true, validators: [Validators.required, this.propertyInCurrentBlock()] }),
            visible: this.fb.control(m?.visible ?? [], { nonNullable: true, validators: [Validators.required] }),
            applyTo: this.fb.control(m?.applyTo ?? [], { nonNullable: true, validators: [Validators.required] }),
            label: this.fb.control(m?.label ?? '', { nonNullable: true, validators: [Validators.required] }),
            required: this.fb.control(m?.required ?? false, { nonNullable: true }),
            shortDescription: this.fb.control(m?.shortDescription ?? '', { nonNullable: true }),
        });
        this.bindApplyToExclusion(group.controls.applyTo);
        return group;
    }

    // 'All' is exclusive of other applyTo targets.
    private bindApplyToExclusion(applyTo: FormControl<string[]>): void {
        let previous: string[] = applyTo.value ?? [];
        applyTo.valueChanges
            .pipe(takeUntil(this._destroy$))
            .subscribe((value: string[]) => {
                const next = value ?? [];
                if (next.includes('All') && next.length > 1) {
                    const allWasPresent = previous.includes('All');
                    const reduced = allWasPresent
                        ? next.filter(v => v !== 'All')
                        : ['All'];
                    previous = reduced;
                    // Defer past PrimeNG's own update cycle so the
                    // overlay checkboxes reflect the normalized value.
                    setTimeout(() => applyTo.setValue(reduced));
                    return;
                }
                previous = next;
            });
    }

    addField(): void {
        const g = this.createFieldGroup();
        this.fields.push(g);
        this.policyEditableFields.push(new PolicyEditableField());
    }

    removeField(index: number): void {
        this.fields.removeAt(index);
        this.policyEditableFields.splice(index, 1);
    }

    onClose(): void {
        this._destroy$.next();
        this.ref.close();
    }

    public toggleSize(): void {
        this.isLargeSize = !this.isLargeSize;
        setTimeout(() => {
            const host = this.dialogHeader?.nativeElement.closest('.p-dynamic-dialog, .guardian-dialog') as HTMLElement | null;
            if (!host) {
                return;
            }
            const width = this.isLargeSize ? '90vw' : '1024px';
            host.style.width = width;
            host.style.maxWidth = width;
            host.style.margin = 'auto';
            host.style.transition = 'all 0.3s ease';
        }, 100);
    }

    public get readonly(): boolean {
        return !this.policyTemplate?.isDraft;
    }

    public propertyLabel(fg: FormGroup<PolicyEditableFieldForm>, index: number): string {
        const path = fg.controls.property.value;
        if (!path) {
            return '';
        }
        const match = this.propertiesOptions(index).find(o => o.path === path);
        return match?.label || path;
    }

    buildFields(): PolicyEditableFieldDTO[]  {
        const blocksByTag = new Map(
            this.policyTemplate.allBlocks.map(b => [b.tag, b.blockType] as const)
        );

        return  this.form.getRawValue().fields ? 
                this.form.getRawValue().fields.map(val => {
                    const field = new PolicyEditableFieldDTO();
                    field.blockType = blocksByTag.get(val.blockTag) ?? '';
                    field.blockTag = val.blockTag;
                    field.propertyPath = val.property;
                    field.visible = val.visible;
                    field.applyTo = val.applyTo;
                    field.label = val.label;
                    field.required = val.required;
                    field.shortDescription = val.shortDescription;
                    return field;
                }) 
                : [];
    }

  async submit(): Promise<void> {
    this.submitted = true;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const fields = this.buildFields();

    const root = this.policyTemplate.getJSON();
    root.editableParametersSettings = fields;

    if (root) {
        this.loading = true;
        this.policyEngineService.update(this.policyTemplate.id, root)
                                .pipe(takeUntil(this._destroy$))
                                .subscribe((policy: any) => {
            if (policy) {
                this.ref.close(policy);
            }
        });
    }
  }

}
