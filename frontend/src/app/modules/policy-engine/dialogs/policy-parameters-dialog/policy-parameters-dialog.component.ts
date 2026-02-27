import { Component } from '@angular/core';
import { UntypedFormControl } from '@angular/forms';
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

    constructor(
        public ref: DynamicDialogRef,
        public config: DynamicDialogConfig,
        private registeredService: RegisteredService,
        private policyEngineService: PolicyEngineService
    ) {
        this.policyId = this.config.data?.policyId;
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

            this.items.push({
                block,
                property,
                config: field
            });
        }
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