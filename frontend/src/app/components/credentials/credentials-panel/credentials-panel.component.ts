import { Component, Input, OnInit } from '@angular/core';
import { CredentialsService } from '../../../services/credentials.service';
import { PolicyEngineService } from '../../../services/policy-engine.service';

@Component({
    selector: 'app-credentials-panel',
    templateUrl: './credentials-panel.component.html',
    styleUrls: ['./credentials-panel.component.scss']
})
export class CredentialsPanelComponent implements OnInit {
    @Input() role: 'user' | 'sr' = 'user';

    loading: boolean = false;
    serviceSchemas: any[] = [];
    globalCredentials: any[] = [];
    policyCredentials: any[] = [];
    activeTabIndex: number = 0;

    policies: any[] = [];
    selectedPolicyId: string | null = null;

    showDialog: boolean = false;
    dialogScope: 'global' | 'policy' = 'global';
    selectedServiceType: string = '';
    selectedDryRun: boolean = false;
    fieldValues: Record<string, string> = {};

    dryRunOptions = [
        { label: 'Production', value: false },
        { label: 'Dry Run', value: true },
    ];

    constructor(
        private credentialsService: CredentialsService,
        private policyEngineService: PolicyEngineService,
    ) {
    }

    ngOnInit(): void {
        this.loadSchemas();
        this.loadGlobalCredentials();
        this.loadPolicies();
    }

    loadSchemas(): void {
        this.credentialsService.getServiceSchemas().subscribe({
            next: (schemas) => this.serviceSchemas = schemas,
            error: () => this.serviceSchemas = [],
        });
    }

    loadPolicies(): void {
        this.policyEngineService.page(0, 100).subscribe({
            next: (response) => {
                this.policies = (response.body || []).map((p: any) => ({
                    label: p.name,
                    value: p.id,
                }));
            },
            error: () => this.policies = [],
        });
    }

    loadGlobalCredentials(): void {
        this.loading = true;
        const obs = this.role === 'sr'
            ? this.credentialsService.getSrGlobalCredentials()
            : this.credentialsService.getUserGlobalCredentials();
        obs.subscribe({
            next: (creds) => { this.globalCredentials = creds; this.loading = false; },
            error: () => { this.globalCredentials = []; this.loading = false; },
        });
    }

    loadPolicyCredentials(): void {
        if (!this.selectedPolicyId) {
            this.policyCredentials = [];
            return;
        }
        this.loading = true;
        const obs = this.role === 'sr'
            ? this.credentialsService.getSrPolicyCredentials(this.selectedPolicyId)
            : this.credentialsService.getUserPolicyCredentials(this.selectedPolicyId);
        obs.subscribe({
            next: (creds) => { this.policyCredentials = creds; this.loading = false; },
            error: () => { this.policyCredentials = []; this.loading = false; },
        });
    }

    onPolicyChange(): void {
        this.loadPolicyCredentials();
    }

    getServiceLabel(serviceType: string): string {
        const schema = this.serviceSchemas.find(s => s.serviceType === serviceType);
        return schema?.label || serviceType;
    }

    getSchemaFields(serviceType: string): any[] {
        const schema = this.serviceSchemas.find(s => s.serviceType === serviceType);
        return schema?.fields || [];
    }

    openAddDialog(scope: 'global' | 'policy'): void {
        this.dialogScope = scope;
        this.selectedServiceType = this.serviceSchemas[0]?.serviceType || '';
        this.selectedDryRun = false;
        this.fieldValues = {};
        this.showDialog = true;
    }

    saveCredential(): void {
        const body = {
            serviceType: this.selectedServiceType,
            dryRun: this.selectedDryRun,
            fields: this.fieldValues,
        };

        let obs;
        if (this.dialogScope === 'global') {
            obs = this.role === 'sr'
                ? this.credentialsService.setSrGlobalCredential(body)
                : this.credentialsService.setUserGlobalCredential(body);
        } else {
            obs = this.role === 'sr'
                ? this.credentialsService.setSrPolicyCredential(this.selectedPolicyId!, body)
                : this.credentialsService.setUserPolicyCredential(this.selectedPolicyId!, body);
        }

        obs.subscribe({
            next: () => {
                this.showDialog = false;
                this.dialogScope === 'global' ? this.loadGlobalCredentials() : this.loadPolicyCredentials();
            },
            error: () => this.showDialog = false,
        });
    }

    deleteCredential(cred: any, scope: 'global' | 'policy'): void {
        let obs;
        if (scope === 'global') {
            obs = this.role === 'sr'
                ? this.credentialsService.deleteSrGlobalCredential(cred.serviceType, cred.dryRun)
                : this.credentialsService.deleteUserGlobalCredential(cred.serviceType, cred.dryRun);
        } else {
            obs = this.role === 'sr'
                ? this.credentialsService.deleteSrPolicyCredential(this.selectedPolicyId!, cred.serviceType, cred.dryRun)
                : this.credentialsService.deleteUserPolicyCredential(this.selectedPolicyId!, cred.serviceType, cred.dryRun);
        }

        obs.subscribe({
            next: () => scope === 'global' ? this.loadGlobalCredentials() : this.loadPolicyCredentials(),
            error: () => scope === 'global' ? this.loadGlobalCredentials() : this.loadPolicyCredentials(),
        });
    }
}
