import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../services/api';
import { IWizardConfig, Schema, Token } from '@guardian/interfaces';
import { SelectorDialogComponent } from '../../common/selector-dialog/selector-dialog.component';
import { PolicyWizardDialogComponent } from '../dialogs/policy-wizard-dialog/policy-wizard-dialog.component';
import { DialogService } from 'primeng/dynamicdialog';
import { CustomConfirmDialogComponent } from '../../common/custom-confirm-dialog/custom-confirm-dialog.component';

export enum WizardMode {
    CREATE = 'CREATE',
    EDIT = 'EDIT',
}

/**
 * Services for working with wizard.
 */
@Injectable()
export class WizardService {
    private readonly url: string = `${API_BASE_URL}/wizard`;

    constructor(
        private http: HttpClient,
        private dialog: DialogService,
        private dialogService: DialogService
    ) {
    }

    public createPolicyAsync(
        config: any
    ): Observable<{ taskId: string; expectation: number }> {
        return this.http.post<{ taskId: string; expectation: number }>(
            `${this.url}/push/policy`,
            config
        );
    }

    public getPolicyConfig(
        policyId: string,
        config: any
    ): Observable<{ wizardConfig: IWizardConfig; policyConfig: any }> {
        return this.http.post<any>(`${this.url}/${policyId}/config`, config);
    }

    public removeWizardPreset(policyId: string) {
        if (!policyId) {
            return;
        }
        try {
            const wizardStates = JSON.parse(
                localStorage.getItem('wizard') || 'null'
            );
            delete wizardStates[policyId];
            localStorage.setItem('wizard', JSON.stringify(wizardStates));
        } catch {
        }
    }

    public setWizardPreset(policyId: string, preset: any) {
        if (!preset || !policyId) {
            return;
        }
        try {
            const wizardStates = JSON.parse(
                localStorage.getItem('wizard') || 'null'
            );
            wizardStates[policyId] = preset;
            localStorage.setItem('wizard', JSON.stringify(wizardStates));
        } catch {
            const wizardStates: any = {};
            wizardStates[policyId] = preset;
            localStorage.setItem('wizard', JSON.stringify(wizardStates));
        }
    }

    private openSaveWizardStateDialog(
        callback: (value: {
            create: boolean;
            config: IWizardConfig;
            currentNode: any;
            saveState: boolean;
        }) => void,
        value: {
            create: boolean;
            config: IWizardConfig;
            currentNode: any;
        }
    ) {
        const dialogRef = this.dialogService.open(CustomConfirmDialogComponent, {
            showHeader: false,
            width: '640px',
            styleClass: 'guardian-dialog',
            data: {
                header: 'Save progress',
                text: `Do you want to save progress?`,
                buttons: [{
                    name: 'Close',
                    class: 'secondary'
                }, {
                    name: 'Confirm',
                    class: 'primary'
                }]
            },
        });
        dialogRef.onClose.subscribe((result: string) => {
            if (result === 'Confirm') {
                callback(Object.assign(value, { saveState: true }));
            } else {
                callback(Object.assign(value, { saveState: false }));
            }
        });
    }

    private openWizardDialog(
        mode: WizardMode,
        callback: (value: {
            create: boolean;
            config: IWizardConfig;
            currentNode: any;
            saveState: boolean;
        }) => void,
        tokens: Token[],
        schemas: Schema[],
        policies: any[],
        policy?: any,
        preset?: any
    ) {
        const dialogRef = this.dialogService.open(PolicyWizardDialogComponent, {
            showHeader: false,
            width: '1100px',
            styleClass: 'guardian-dialog',
            header: 'Policy Wizard',
            data: {
                policy,
                policies,
                schemas,
                tokens,
                state: preset
            }
        });
        dialogRef
            .onClose
            .subscribe(
                (value: {
                    create: boolean;
                    config: IWizardConfig;
                    currentNode: any;
                }) => {
                    if (!value?.create && mode === WizardMode.CREATE) {
                        return;
                    }
                    this.openSaveWizardStateDialog(callback, value);
                }
            );
    }

    public openPolicyWizardDialog(
        mode: WizardMode,
        callback: (value: {
            create: boolean;
            config: IWizardConfig;
            currentNode: any;
            saveState: boolean;
        }) => void,
        tokens: Token[],
        schemas: Schema[],
        policies: any[],
        policy?: any
    ) {
        try {
            const wizardStates = JSON.parse(
                localStorage.getItem('wizard') || 'null'
            );
            if (!wizardStates) {
                this.openWizardDialog(
                    mode,
                    callback,
                    tokens,
                    schemas,
                    policies,
                    policy
                );
                return;
            }
            const wizardPolicies = Object.keys(wizardStates);
            const options: any = policies
                ?.filter((policy) => wizardPolicies.includes(policy.id))
                .map((policy) =>
                    Object({
                        name: policy.name,
                        value: policy.id,
                        topicId: policy.topicId,
                    })
                );
            if (!options.length) {
                this.openWizardDialog(
                    mode,
                    callback,
                    tokens,
                    schemas,
                    policies,
                    policy
                );
                return;
            }
            const selectorDialog = this.dialog.open(SelectorDialogComponent, {
                showHeader: false,
                width: '400px',
                styleClass: 'guardian-dialog',
                data: {
                    title: 'Restore progress',
                    description: 'Choose policy',
                    label: 'New policy',
                    options: [{
                        name: 'New policy',
                    }].concat(options),
                }
            });
            selectorDialog.onClose.subscribe((value) => {
                if (!value?.ok) {
                    return;
                }
                this.openWizardDialog(
                    mode,
                    callback,
                    tokens,
                    schemas,
                    policies,
                    policy,
                    value?.result && wizardStates[value.result]
                );
            });
        } catch (error) {
            localStorage.removeItem('wizard');
            this.openWizardDialog(
                mode,
                callback,
                tokens,
                schemas,
                policies,
                policy
            );
        }
    }
}
