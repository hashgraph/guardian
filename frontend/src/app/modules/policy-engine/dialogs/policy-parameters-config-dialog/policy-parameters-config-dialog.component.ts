import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { PolicyTemplate } from '../../structures';
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
    loading = true;
    submitted = false;
    form: FormGroup<PolicyForm>;
    policyTemplate: PolicyTemplate;
    policyEditableFields: PolicyEditableField[] = [];
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
            fields: this.fb.array(this.policyEditableFields.map(m => this.createFieldGroup(m))),
        });
    }

    ngOnInit() {
        this.loading = false;

        if(this.policyTemplate.editableParametersSettings) {
            this.policyEditableFields = this.policyTemplate.editableParametersSettings?.map(ep => PolicyEditableFieldDTO.fromDTO(ep));
        }

        this.policyEngineService.getBlockInformation()
            .pipe(takeUntil(this._destroy$))
            .subscribe(blockInfo => {
                this.registeredService.registerConfig(blockInfo);
                this.loadData();
            });
    }
 
    loadData() {
        const fields = this.policyTemplate.editableParametersSettings;
        if(!fields?.length) {
            return;
        }

        fields.forEach((field: PolicyEditableFieldDTO) => {
            const block = this.policyTemplate.allBlocks.find(b => b.tag === field.blockTag);
            if(!block) {
                return;
            }

            const formField: any  = { ...field };
            const g = this.createFieldGroup(formField);
            this.fields.push(g);
        });
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
        fg.controls.blockTag.setValue(selected?.tag ?? selected);

        fg.controls.blockTag.markAsDirty();
        fg.controls.blockTag.markAsTouched();
        fg.controls.blockTag.updateValueAndValidity({ emitEvent: true });

        this.policyEditableFields[index].properties = [];

        this.policyTemplate.allBlocks.forEach(block => {
            if (block.tag === selected) {
                const props = this.registeredService.getCustomProperties(block.blockType);
                const propsWithPath = this.setPath(props.filter((prop: any) => prop.editable), []);
                if(propsWithPath && propsWithPath.length > 0) {
                    this.policyEditableFields[index].properties = propsWithPath;
                }
            }
        });
    }

    createFieldGroup(m?: Partial<PolicyEditableField>): FormGroup<PolicyEditableFieldForm> {
        return this.fb.group<PolicyEditableFieldForm>({
            blockTag: this.fb.control(m?.blockTag ?? '', { nonNullable: true, validators: [Validators.required] }),
            property: this.fb.control(m?.propertyPath ?? '', { nonNullable: true, validators: [Validators.required] }),
            visible: this.fb.control(m?.visible ?? [], { nonNullable: true, validators: [Validators.required] }),
            applyTo: this.fb.control(m?.applyTo ?? [], { nonNullable: true, validators: [Validators.required] }),
            label: this.fb.control(m?.label ?? '', { nonNullable: true, validators: [Validators.required] }),
            required: this.fb.control(m?.required ?? false, { nonNullable: true }),
            shortDescription: this.fb.control(m?.shortDescription ?? '', { nonNullable: true }),
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
