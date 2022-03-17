import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { IToken, IUser } from 'interfaces';
import { ToastrService } from 'ngx-toastr';
import { forkJoin } from 'rxjs';
import { SetVersionDialog } from 'src/app/schema-engine/set-version-dialog/set-version-dialog.component';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { ProfileService } from 'src/app/services/profile.service';
import { TokenService } from 'src/app/services/token.service';
import { ExportPolicyDialog } from '../../helpers/export-policy-dialog/export-policy-dialog.component';
import { NewPolicyDialog } from '../../helpers/new-policy-dialog/new-policy-dialog.component';
import { ImportPolicyDialog } from '../../helpers/import-policy-dialog/import-policy-dialog.component';
import { PreviewPolicyDialog } from '../../helpers/preview-policy-dialog/preview-policy-dialog.component';

/**
 * Component for choosing a policy and
 * display blocks of the selected policy
 */
@Component({
    selector: 'app-policy-viewer',
    templateUrl: './policy-viewer.component.html',
    styleUrls: ['./policy-viewer.component.css']
})
export class PolicyViewerComponent implements OnInit {
    policyId!: string;
    policy: any | null;
    policyInfo: any | null;
    policies: any[] | null;
    columns: string[] = [];
    columnsRole = {
        "ROOT_AUTHORITY": [
            'name',
            'id',
            'version',
            'description',
            'status',
            'export',
            'edit',
            'open',
            'operation'
        ],
        "USER": [
            'name',
            'version',
            'description',
            'open',
        ]
    };
    role!: any;
    tokens!: IToken[];

    loading: boolean = true;
    isConfirmed: boolean = false;

    constructor(
        private profileService: ProfileService,
        private policyEngineService: PolicyEngineService,
        private tokenService: TokenService,
        private route: ActivatedRoute,
        private router: Router,
        private dialog: MatDialog,
        private toastr: ToastrService
    ) {
        this.policies = null;
        this.policy = null;
    }

    ngOnInit() {
        this.loading = true;
        this.route.queryParams.subscribe(queryParams => {
            this.loadPolicy();
        });
    }

    loadPolicy() {
        const policyId = this.route.snapshot.queryParams['policyId'];
        if (policyId && this.policyId == policyId) {
            return;
        }

        this.policyId = policyId;
        this.policies = null;
        this.policy = null;
        this.isConfirmed = false;
        this.loading = true;
        this.profileService.getProfile().subscribe((profile: IUser | null) => {
            this.isConfirmed = !!(profile && profile.confirmed);
            this.role = profile ? profile.role : null;
            if (this.isConfirmed) {
                if (this.policyId) {
                    this.loadPolicyById(this.policyId);
                } else {
                    this.loadAllPolicy();
                }
            } else {
                setTimeout(() => {
                    this.loading = false;
                }, 500);
            }
        }, (e) => {
            this.loading = false;
        });
    }

    loadPolicyById(policyId: string) {
        forkJoin([
            this.policyEngineService.policyBlock(policyId),
            this.policyEngineService.all()
        ]).subscribe((value) => {
            this.policy = value[0];
            if (value[1]) {
                this.policyInfo = value[1].find(e => e.id == policyId);
            } else {
                this.policyInfo = null;
            }
            setTimeout(() => {
                this.loading = false;
            }, 500);
        }, (e) => {
            this.loading = false;
        });
    }

    loadAllPolicy() {
        if (this.role == 'ROOT_AUTHORITY') {
            this.columns = this.columnsRole['ROOT_AUTHORITY'];
            forkJoin([
                this.policyEngineService.all(),
                this.tokenService.getTokens()
            ]).subscribe((value) => {
                const policies: any[] = value[0];
                const tokens: IToken[] = value[1];
                this.updatePolicy(policies);
                this.tokens = tokens;
                setTimeout(() => {
                    this.loading = false;
                }, 500);
            }, (e) => {
                this.loading = false;
            });
        } else {
            this.columns = this.columnsRole['USER'];
            forkJoin([
                this.policyEngineService.all(),
            ]).subscribe((value) => {
                const policies: any[] = value[0];
                this.updatePolicy(policies);
                setTimeout(() => {
                    this.loading = false;
                }, 500);
            }, (e) => {
                this.loading = false;
            });
        }
    }

    newPolicy() {
        const dialogRef = this.dialog.open(NewPolicyDialog, {
            width: '500px',
            data: {
                tokens: this.tokens
            }
        });

        dialogRef.afterClosed().subscribe(async (result) => {
            if (result) {
                this.loading = true;
                this.policyEngineService.create(result).subscribe((policies: any) => {
                    this.updatePolicy(policies);
                    setTimeout(() => {
                        this.loading = false;
                    }, 500);
                }, (e) => {
                    this.loading = false;
                });
            }
        });
    }

    setVersion(element: any) {
        const dialogRef = this.dialog.open(SetVersionDialog, {
            width: '350px',
            data: {}
        });
        dialogRef.afterClosed().subscribe((version) => {
            if (version) {
                this.publish(element, version);
            }
        });
    }

    private publish(element: any, version: string) {
        this.loading = true;
        this.policyEngineService.publish(element.id, version).subscribe((data: any) => {
            const { policies, isValid, errors } = data;
            if (!isValid) {
                let text = [];
                const blocks = errors.blocks;
                const invalidBlocks = blocks.filter((block: any) => !block.isValid);
                for (let i = 0; i < invalidBlocks.length; i++) {
                    const block = invalidBlocks[i];
                    for (let j = 0; j < block.errors.length; j++) {
                        const error = block.errors[j];
                        text.push(`<div>${block.id}: ${error}</div>`);
                    }
                }
                this.toastr.error(text.join(''), 'The policy is invalid', {
                    timeOut: 30000,
                    closeButton: true,
                    positionClass: 'toast-bottom-right',
                    enableHtml: true
                });
            }
            this.updatePolicy(policies);
            setTimeout(() => {
                this.loading = false;
            }, 500);
        }, (e) => {
            this.loading = false;
        });
    }

    updatePolicy(policies: any[]) {
        this.policies = policies || [];
        for (let i = 0; i < this.policies.length; i++) {
            const element = this.policies[i];
            element.topicURL = `https://testnet.dragonglass.me/hedera/topics/${element.topicId}`
        }
    }

    exportPolicy(element: any) {
        this.policyEngineService.exportInMessage(element.id)
            .subscribe(exportedPolicy => this.dialog.open(ExportPolicyDialog, {
                width: '700px',
                panelClass: 'g-dialog',
                data: {
                    policy: exportedPolicy
                },
                autoFocus: false
            }));
    }

    importPolicy(messageId?: string) {
        const dialogRef = this.dialog.open(ImportPolicyDialog, {
            width: '500px',
            autoFocus: false,
            data: {
                timeStamp: messageId
            }
        });
        dialogRef.afterClosed().subscribe(async (result) => {
            if (result) {
                this.importPolicyDetails(result);
            }
        });
    }

    importPolicyDetails(result: any) {
        const { type, data, policy } = result;
        const dialogRef = this.dialog.open(PreviewPolicyDialog, {
            width: '950px',
            panelClass: 'g-dialog',
            data: {
                policy: policy
            }
        });
        dialogRef.afterClosed().subscribe(async (result) => {
            if (result) {
                if (result.messageId) {
                    this.importPolicy(result.messageId);
                    return;
                }

                this.loading = true;
                if (type == 'message') {
                    this.policyEngineService.importByMessage(data).subscribe((policies) => {
                        this.updatePolicy(policies);
                        setTimeout(() => {
                            this.loading = false;
                        }, 500);
                    }, (e) => {
                        this.loading = false;
                    });
                } else if (type == 'file') {
                    this.policyEngineService.importByFile(data).subscribe((policies) => {
                        this.updatePolicy(policies);
                        setTimeout(() => {
                            this.loading = false;
                        }, 500);
                    }, (e) => {
                        this.loading = false;
                    });
                }
            }
        });
    }
}
