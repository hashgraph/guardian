import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { IToken } from 'interfaces';
import { forkJoin } from 'rxjs';
import { AuthService } from 'src/app/services/auth.service';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { TokenService } from 'src/app/services/token.service';
import { NewPolicyDialog } from '../../new-policy-dialog/new-policy-dialog.component';

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
            'id',
            'name',
            'version',
            'description',
            'status',
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
    role!: string;
    tokens!: IToken[];

    loading: boolean = true;
    isConfirmed: boolean = false;

    constructor(
        private auth: AuthService,
        private policyEngineService: PolicyEngineService,
        private tokenService: TokenService,
        private route: ActivatedRoute,
        private router: Router,
        private dialog: MatDialog
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
        this.policyId = policyId;
        this.policies = null;
        this.policy = null;
        this.isConfirmed = false;
        this.loading = true;
        this.auth.getCurrentUser(true).subscribe((user: any) => {
            const isLogin = !!user;
            this.isConfirmed = isLogin ? user.did : false;
            this.role = isLogin ? user.role : null;
            if(this.isConfirmed) {
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
            this.policyEngineService.getPolicy(policyId),
            this.policyEngineService.getAllPolicy()
        ]).subscribe((value) => {
            this.policy = value[0];
            if(value[1]) {
                this.policyInfo =  value[1].find(e=>e.id == policyId);
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
                this.policyEngineService.getAllPolicy(),
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
                this.policyEngineService.getAllPolicy(),
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
                this.policyEngineService.createPolicy(result).subscribe((policies: any) => {
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

    publish(element: any) {
        this.loading = true;
        this.policyEngineService.publishPolicy(element.id).subscribe((policies: any) => {
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
}
