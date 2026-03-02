import { Component } from '@angular/core';
import { AbstractControl, FormArray, FormControl, FormGroup, UntypedFormControl, Validators } from '@angular/forms';
import { PolicyEditableFieldDTO, UserPermissions } from '@guardian/interfaces';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { RegisteredService } from '../../services/registered.service';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { PolicyBlock } from '../../structures';
import { Subject, takeUntil } from 'rxjs';

/**
 * Policy parameters dialog.
 */
interface PolicyParameterItem {
    block: PolicyBlock,
    property: any,
    propertyPath: string,
    config: PolicyEditableFieldDTO,
}

@Component({
    selector: 'policy-parameters-dialog',
    templateUrl: './policy-parameters-dialog.component.html',
    styleUrls: ['./policy-parameters-dialog.component.scss']
})
export class PolicyParametersDialog {
    public blockInfo: any;
    public loading = false;
    public policyId: string;
    public editableParameters: PolicyEditableFieldDTO[] = [];

    public user: UserPermissions = new UserPermissions();

    public searchFilter = new UntypedFormControl('');
    public readonly: boolean = false;
    private _destroy$ = new Subject<void>();

    public items: PolicyParameterItem[] = [];

    public form: FormGroup<any>;
    
    public pathOptions = [
        { label: 'Root', value: '', title: ' ' },
        { label: 'Document', value: 'document.', title: 'document.' },
        { label: 'Credential Subjects', value: 'document.credentialSubject.', title: 'document.credentialSubject.' },
        { label: 'First Credential Subjects', value: 'document.credentialSubject.0.', title: 'document.credentialSubject.0.' },
        { label: 'Last Credential Subjects', value: 'document.credentialSubject.L.', title: 'document.credentialSubject.L.' },
        { label: 'Verifiable Credentials', value: 'document.verifiableCredential.', title: 'document.verifiableCredential.' },
        { label: 'First Verifiable Credential', value: 'document.verifiableCredential.0.', title: 'document.verifiableCredential.0.' },
        { label: 'Last Verifiable Credential', value: 'document.verifiableCredential.L.', title: 'document.verifiableCredential.L.' },
        { label: 'Attributes', value: 'option.', title: 'option.' }
    ];

    constructor(
        public ref: DynamicDialogRef,
        public config: DynamicDialogConfig,
        private registeredService: RegisteredService,
        private policyEngineService: PolicyEngineService
    ) {
        this.policyId = this.config.data?.policyId;

        this.form = new FormGroup({
            items: new FormArray<AbstractControl<any>>([])
        });
    }

    ngOnInit() {
        this.policyEngineService.getBlockInformation()
            .pipe(takeUntil(this._destroy$))
            .subscribe(blockInfo => {
                this.registeredService.registerConfig(blockInfo);
                this.blockInfo = blockInfo;
                this.loadConfig();
            });

    }

    loadConfig() {
        this.policyEngineService.getParametersConfig(this.policyId).subscribe((response: any) => {
            this.editableParameters = response || [];
            this.loadItems();
        });
    }

    loadItems() {
        for(let i=0; i< this.editableParameters.length; i++) {
            const field = this.editableParameters[i];
            const block = structuredClone(this.blockInfo[field.blockType]);

            const property = this.findByPath(block.properties, field.propertyPath);
            if (!property) {
                continue;
            }
            this.items.push({
                block,
                property,
                propertyPath: field.propertyPath,
                config: field
            });
            if (property.type === 'Array') {
                const values = Array.isArray(field.value) ? field.value : [];

                const arr = new FormArray<AbstractControl>(
                    values.map(v => {
                    const g: Record<string, FormControl> = {};
                    for (const p of property.items.properties ?? []) {
                        g[p.name] = new FormControl(
                        v?.[p.name] ?? null,
                        p.required ? [Validators.required] : []
                        );
                    }
                    return new FormGroup(g);
                    })
                );
                
                this.form.addControl(field.propertyPath, arr);
            } else if (property.type === 'Path') {
                const initial = (field.value ?? '') as string;
                const options: string[] = this.pathOptions.map(o => String(o.value ?? ''));

                let prefix = '';
                for (const opt of options.sort((a, b) => b.length - a.length)) {
                    if (initial.startsWith(opt)) {
                    prefix = opt;
                    break;
                    }
                }

                const suffix = initial.slice(prefix.length);
                this.form.addControl(
                    property.name,
                    new FormGroup({
                    path: new FormControl(prefix, []),
                    value: new FormControl(
                        suffix,
                        field.required ? [Validators.required] : []
                    ),
                    })
                );
            }
            else {
                this.form.addControl(
                        field.propertyPath,
                        new FormControl(
                        field.value ?? null,
                        field.required ? [Validators.required] : []
                    )
                );
            }
        }

        setTimeout(() => {
            Object.values(this.form.controls).forEach(ctrl => {
                ctrl.markAsDirty();
                ctrl.markAsTouched();
            });
        })
    }

    findByPath(items: any[], path: string): any | undefined {
        const parts = path.split('.');
        let currentLevel = items;
        let found;

        for (const part of parts) {
            found = currentLevel.find(p => p.name === part);
            if (!found) return undefined;

            currentLevel = found.properties || [];
        }

        return found;
    }

    async onSubmit() {
        for(let i=0; i< this.editableParameters.length; i++) {
            const field = this.editableParameters[i];
            const item = this.items.find(item => item.propertyPath === field.propertyPath);
            let value = null;
            if(item && item.property.type === 'Path') {
                const group = this.form.get(field.propertyPath) as FormGroup;
                const path = group.get('path')?.value ?? '';
                value = path + (group.get('value')?.value ?? '');
            } else {
                value = item && this.form.controls[item.propertyPath]?.value;
            }
            field.value = value;
        }

        this.policyEngineService.saveParameters(
            this.policyId,
            this.editableParameters
        ).subscribe(
            (_) => {
                this.onClose();
            }
        );
    }

    onSave() {
    }

    public onClose(): void {
        this.ref.close(null);
    }
}