import { Component } from '@angular/core';
import {
    FormBuilder,
    FormControl,
    FormGroup,
    Validators,
} from '@angular/forms';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { IPolicyCategory } from '../../structures';
import { PolicyCategoryType } from '@guardian/interfaces';

/**
 * Dialog for creating policy.
 */
@Component({
    selector: 'new-policy-dialog',
    templateUrl: './new-policy-dialog.component.html',
    styleUrls: ['./new-policy-dialog.component.scss'],
})
export class NewPolicyDialog {
    loading: boolean = false;

    categories: IPolicyCategory[] = [];

    appliedTechnologyTypeOptions: IPolicyCategory[] = [];
    migrationActivityTypeOptions: IPolicyCategory[] = [];
    projectScaleOptions: IPolicyCategory[] = [];
    sectoralScopeOptions: IPolicyCategory[] = [];
    subTypeOptions: IPolicyCategory[] = [];

    started = false;
    dataForm: FormGroup;

    constructor(
        public ref: DynamicDialogRef,
        public config: DynamicDialogConfig,
        private fb: FormBuilder,
        private policyEngineService: PolicyEngineService
    ) {
        this.loading = true;
        this.policyEngineService
            .getPolicyCategories()
            .subscribe((data: any) => {
                this.loading = false;
                this.categories = data;

                this.categories.forEach((item: IPolicyCategory) => {
                    switch (item.type) {
                        case PolicyCategoryType.APPLIED_TECHNOLOGY_TYPE:
                            this.appliedTechnologyTypeOptions.push(item);
                            break;
                        case PolicyCategoryType.MITIGATION_ACTIVITY_TYPE:
                            this.migrationActivityTypeOptions.push(item);
                            break;
                        case PolicyCategoryType.PROJECT_SCALE:
                            this.projectScaleOptions.push(item);
                            break;
                        case PolicyCategoryType.SECTORAL_SCOPE:
                            this.sectoralScopeOptions.push(item);
                            break;
                        case PolicyCategoryType.SUB_TYPE:
                            this.subTypeOptions.push(item);
                            break;

                        default:
                            break;
                    }
                });

                this.updateFormControlState();
            });

        this.dataForm = this.fb.group({
            name: ['', Validators.required],
            sectoralScope: new FormControl({
                value: '',
                disabled: this.loading,
            }),
            projectScale: new FormControl({
                value: '',
                disabled: this.loading,
            }),
            applicabilityConditions: [''],
            detailsUrl: [''],
            policyTag: [`Tag_${Date.now()}`, Validators.required],
            typicalProjects: [''],
            topicDescription: [''],
            description: [''],
            appliedTechnologyType: new FormControl({
                value: '',
                disabled: this.loading,
            }),
            migrationActivityType: new FormControl({
                value: [],
                disabled: this.loading,
            }),
            subType: new FormControl({value: [], disabled: this.loading}),
            atValidation: [''],
            monitored: [''],
        });
    }

    updateFormControlState() {
        if (this.loading) {
            this.dataForm.get('sectoralScope')?.disable();
            this.dataForm.get('projectScale')?.disable();
            this.dataForm.get('appliedTechnologyType')?.disable();
            this.dataForm.get('migrationActivityType')?.disable();
            this.dataForm.get('subType')?.disable();
        } else {
            this.dataForm.get('sectoralScope')?.enable();
            this.dataForm.get('projectScale')?.enable();
            this.dataForm.get('appliedTechnologyType')?.enable();
            this.dataForm.get('migrationActivityType')?.enable();
            this.dataForm.get('subType')?.enable();
        }
    }

    ngOnInit() {
        this.started = true;
    }

    onNoClick(): void {
        this.ref.close(null);
    }

    onSubmit() {
        if (this.dataForm.valid) {
            const {
                sectoralScope,
                projectScale,
                appliedTechnologyType,
                migrationActivityType,
                subType,
                atValidation,
                monitored,
                ...data
            } = this.dataForm.value;

            data.categories = [
                sectoralScope,
                projectScale,
                appliedTechnologyType,
                ...migrationActivityType,
                ...subType,
            ];
            data.importantParameters = {
                atValidation,
                monitored,
            };
            data.policyTag = data.policyTag.replace(/\s/g, '');

            this.ref.close(data);
        }
    }
}
