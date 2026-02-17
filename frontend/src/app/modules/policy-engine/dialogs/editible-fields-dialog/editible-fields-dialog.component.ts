import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { SelectItem } from 'primeng/api/public_api';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { PolicyBlock, PolicyItem, PolicyTemplate } from '../../structures';
import { RegisteredService } from '../../services/registered.service';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { Subject, takeUntil } from 'rxjs';
import { PolicyEditableField } from '@guardian/interfaces';

type PolicyEditableFieldForm = {
  blockTag: FormControl<string>;
  property: FormControl<string>;
  visible: FormControl<string[]>;
  appliesTo: FormControl<string[]>;
  defaultLabel: FormControl<string>;
  required: FormControl<boolean>;
  blocks: FormControl<any[]>;
  properties: FormControl<any[]>;
  roles: FormControl<any[]>;
  targets: FormControl<any[]>;
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
    form: FormGroup<PolicyForm>;
    policyTemplate: PolicyTemplate;
    customProperties!: any[];
    blockInfo: any;
    selectedBlock: any;
    private _destroy$ = new Subject<void>();

    blockItems: PolicyItem[] = [];
    propertyItems: SelectItem[] = [];
     
    loading = true;

    policyEditibleFields: PolicyEditableField[] = [];

    constructor(
        public ref: DynamicDialogRef,
        public config: DynamicDialogConfig,
        private fb: FormBuilder,
        private registeredService: RegisteredService,
        private policyEngineService: PolicyEngineService,
    ) {
        this.blockItems = this.config.data.blockItems;
        this.propertyItems = this.config.data.propertyItems;

        this.policyTemplate = this.config.data.policy;

        this.form = this.fb.group<PolicyForm>({
            fields: this.fb.array(this.policyEditibleFields.map(m => this.createFieldGroup(m))),
        });
    }

    ngOnInit() {
        this.loading = false;
        this.policyEngineService.getBlockInformation()
        .pipe(takeUntil(this._destroy$))
        .subscribe(blockInfo => {
            this.blockInfo = blockInfo;
            this.registeredService.registerConfig(blockInfo);
        });
    }

    get blockOptions(): SelectItem[] {
        return this.policyTemplate.allBlocks.map(block => ({
            label: block.tag,
            value: block.id
        }));
    }

    get fieldGroups(): FormGroup<PolicyEditableFieldForm>[] {
        return this.form.controls.fields.controls as FormGroup<PolicyEditableFieldForm>[];
    }

    onBlockChange(selected: any, index: number): void {
        const fg = this.fields.at(index) as FormGroup<PolicyEditableFieldForm>;

        fg.controls.blockTag.setValue(selected?.tag ?? selected);

        let customProperties: any[] = [];
        let selectedBlock: PolicyBlock = null as any;
        this.policyTemplate.allBlocks.forEach(block => {
            if (block.id === selected.id) {
                selectedBlock = block;
                const props = this.registeredService.getCustomProperties(block.blockType);
                if(props && props.length > 0) {
                    customProperties = [...props];
                }
            }
        });
            
        fg.controls.properties.setValue(customProperties);
        fg.controls.property.setValue('');
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
            blocks: this.fb.control(m?.blocks ?? [], { nonNullable: true }),
            properties: this.fb.control(m?.properties ?? [], { nonNullable: true }),
            roles: this.fb.control(m?.roles ?? [], { nonNullable: true }),
            targets: this.fb.control(m?.targets ?? [], { nonNullable: true }),
            shortDescription: this.fb.control(m?.shortDescription ?? '', { nonNullable: true }),
        });
    }

    addField(): void {
        const g = this.createFieldGroup({
            blocks: this.policyTemplate.allBlocks,
            roles: this.policyTemplate.policyRoles,
        });

        this.fields.push(g);
    }

    removeField(index: number): void {
        this.fields.removeAt(index);
    }

    get fieldsArray(): FormArray {
        return this.form.get('fields') as FormArray;
    }

    get fields(): FormArray {
        return this.form.get('fields') as FormArray<FormGroup>;
    }


    onClose(): void {
        this._destroy$.next();
    }

  buildPayload(): { fields: PolicyEditableField[] } {
    const fields = (this.form.getRawValue().fields ?? []) as PolicyEditableField[];
    return { fields };
  }

  async submit(): Promise<void> {
    //console.log('submit', this.form.getRawValue());
    // if (this.form.invalid) {
    //   this.form.markAllAsTouched();
    //   return;
    // }

    const payload = this.buildPayload();
    console.log('before submit payload');
    const res = JSON.stringify(payload.fields.map(f => ({
        blockTag: f.blockTag,
        property: f.property,
        visible: f.visible ?? [],
        appliesTo: f.appliesTo ?? [],
        label: f.label,
        defaultLabel: f.defaultLabel,
        required: !!f.required,
        shortDescription: f.shortDescription,
    })));

    const root = this.policyTemplate.getJSON();
    root.editableParametersSettings = res;
    if (root) {
        this.loading = true;
        this.policyEngineService.update(this.policyTemplate.id, root).pipe(takeUntil(this._destroy$)).subscribe((policy: any) => {
            if (policy) {
                console.log('updated policy', policy);
                this.ref.close(res);
            }
        });
    }
  }

}
