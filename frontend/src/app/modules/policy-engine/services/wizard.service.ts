import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../services/api';
import { IWizardConfig, Schema, Token } from '@guardian/interfaces';
import { SelectorDialogComponent } from '../../common/selector-dialog/selector-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmationDialogComponent } from '../../common/confirmation-dialog/confirmation-dialog.component';
import { PolicyWizardDialogComponent } from '../helpers/policy-wizard-dialog/policy-wizard-dialog.component';
import { DialogService } from 'primeng/dynamicdialog';

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

    constructor(private http: HttpClient, private dialog: MatDialog, private dialogService: DialogService,) {
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
        } catch {}
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
        const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
            data: {
                dialogTitle: 'Save progress',
                dialogText: 'Do you want to save progress?',
            },
            disableClose: true,
        });
        dialogRef.afterClosed().subscribe((saveState) => {
            callback(Object.assign(value, { saveState }));
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
            header: 'Policy Wizard',
            styleClass: 'custom-dialog',
            width: '1100px',
            data: {
                policy,
                policies,
                schemas,
                tokens,
                state: preset,
            },
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
                width: '400px',
                data: {
                    title: 'Restore progress',
                    description: 'Choose policy',
                    label: 'New policy',
                    options: [
                        {
                            name: 'New policy',
                        },
                    ].concat(options),
                },
                disableClose: true,
            });
            selectorDialog.afterClosed().subscribe((value) => {
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
