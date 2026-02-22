import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { PolicyTemplate } from '../../structures';
import { RegisteredService } from '../../services/registered.service';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { Subject, takeUntil } from 'rxjs';
import { PolicyEditableField, PolicyEditableFieldDto } from '@guardian/interfaces';

type PolicyEditableFieldForm = {
  blockTag: FormControl<string>;
  property: FormControl<string>;
  visible: FormControl<string[]>;
  appliesTo: FormControl<string[]>;
  defaultLabel: FormControl<string>;
  required: FormControl<boolean>;
  label: FormControl<string>;
  shortDescription: FormControl<string>;
};


type PolicyForm = {
  fields: FormArray<FormGroup<PolicyEditableFieldForm>>;
};

@Component({
    selector: 'app-editible-fields-dialog',
    templateUrl: './editible-fields-dialog.component.html',
    styleUrls: ['./editible-fields-dialog.component.scss'],
})
export class EditibleFieldsDialog implements OnInit {
    loading = true;
    form: FormGroup<PolicyForm>;
    policyTemplate: PolicyTemplate;
    policyEditibleFields: PolicyEditableField[] = [];
    additionalOptionsAppliesTo = [
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
            fields: this.fb.array(this.policyEditibleFields.map(m => this.createFieldGroup(m))),
        });
    }

    ngOnInit() {
        this.loading = false;

        if(this.policyTemplate.editableParametersSettings) {
            this.policyEditibleFields = this.policyTemplate.editableParametersSettings?.map(ep => PolicyEditableFieldDto.fromDTO(ep));
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

        fields.forEach((field: PolicyEditableFieldDto) => {
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

    get appliesToOptions(): any[] {
        return [...this.additionalOptionsAppliesTo, ...this.policyTemplate.policyRoles];
    }

    get fieldGroups(): FormGroup<PolicyEditableFieldForm>[] {
        return this.form.controls.fields.controls as FormGroup<PolicyEditableFieldForm>[];
    }

    public propertiesOptions(index: number): any[] {
        return this.policyEditibleFields[index]?.properties ?? [];
    }

    onBlockChange(selected: any, index: number): void {
        const fg = this.fields.at(index) as FormGroup<PolicyEditableFieldForm>;
        fg.controls.blockTag.setValue(selected?.tag ?? selected);

        this.policyTemplate.allBlocks.forEach(block => {
            if (block.tag === selected) {
                const props = this.registeredService.getCustomProperties(block.blockType);
                if(props && props.length > 0) {
                    this.policyEditibleFields[index].properties = props;
                }
            }
        });
    }

    createFieldGroup(m?: Partial<PolicyEditableField>): FormGroup<PolicyEditableFieldForm> {
        return this.fb.group<PolicyEditableFieldForm>({
            blockTag: this.fb.control(m?.blockTag ?? '', { nonNullable: true, validators: [Validators.required] }),
            property: this.fb.control(m?.property ?? '', { nonNullable: true, validators: [Validators.required] }),
            visible: this.fb.control(m?.visible ?? [], { nonNullable: true, validators: [Validators.required] }),
            appliesTo: this.fb.control(m?.appliesTo ?? [], { nonNullable: true, validators: [Validators.required] }),
            label: this.fb.control(m?.label ?? '', { nonNullable: true, validators: [Validators.required] }),
            defaultLabel: this.fb.control(m?.defaultLabel ?? null),
            required: this.fb.control(m?.required ?? false, { nonNullable: true }),
            shortDescription: this.fb.control(m?.shortDescription ?? '', { nonNullable: true }),
        });
    }

    addField(): void {
        const g = this.createFieldGroup();
        this.fields.push(g);
        this.policyEditibleFields.push(new PolicyEditableField());
    }

    removeField(index: number): void {
        this.fields.removeAt(index);
        this.policyEditibleFields.splice(index, 1);
    }

    onClose(): void {
        this._destroy$.next();
        this.ref.close();
    }

    buildFields(): PolicyEditableFieldDto[]  {
        return  this.form.getRawValue().fields ? 
                this.form.getRawValue().fields.map(val => {
                    const field = new PolicyEditableFieldDto();
                    field.blockTag = val.blockTag;
                    field.property = val.property;
                    field.visible = val.visible;
                    field.appliesTo = val.appliesTo;
                    field.label = val.label;
                    field.defaultLabel = val.defaultLabel;
                    field.required = val.required;
                    field.shortDescription = val.shortDescription;
                    return field;
                }) 
                : [];
    }

  async submit(): Promise<void> {
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
