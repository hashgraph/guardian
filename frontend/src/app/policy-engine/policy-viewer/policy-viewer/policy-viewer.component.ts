import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { IToken, IUser, UserRole } from '@guardian/interfaces';
import { ToastrService } from 'ngx-toastr';
import { forkJoin, Subscription } from 'rxjs';
import { SetVersionDialog } from 'src/app/schema-engine/set-version-dialog/set-version-dialog.component';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { ProfileService } from 'src/app/services/profile.service';
import { TokenService } from 'src/app/services/token.service';
import { ExportPolicyDialog } from '../../helpers/export-policy-dialog/export-policy-dialog.component';
import { NewPolicyDialog } from '../../helpers/new-policy-dialog/new-policy-dialog.component';
import { ImportPolicyDialog } from '../../helpers/import-policy-dialog/import-policy-dialog.component';
import { PreviewPolicyDialog } from '../../helpers/preview-policy-dialog/preview-policy-dialog.component';
import { WebSocketService } from 'src/app/services/web-socket.service';

/**
 * Component for choosing a policy and
 * display blocks of the selected policy
 */
@Component({
    selector: 'app-policy-viewer',
    templateUrl: './policy-viewer.component.html',
    styleUrls: ['./policy-viewer.component.css']
})
export class PolicyViewerComponent implements OnInit, OnDestroy {
    policyId!: string;
    policy: any | null;
    policyInfo: any | null;
    role!: any;
    loading: boolean = true;
    isConfirmed: boolean = false;
    virtualUsers: any[] = []
    view: string = 'policy';

    private subscription = new Subscription();

    constructor(
        private profileService: ProfileService,
        private policyEngineService: PolicyEngineService,
        private wsService: WebSocketService,
        private tokenService: TokenService,
        private route: ActivatedRoute,
        private router: Router,
        private dialog: MatDialog,
        private toastr: ToastrService
    ) {
        this.policy = null;
    }

    ngOnInit() {
        this.loading = true;
        this.subscription.add(
            this.route.queryParams.subscribe(queryParams => {
                this.loadPolicy();
            })
        );

        this.subscription.add(
            this.wsService.subscribeUserInfo((message => {
                this.policyInfo.userRoles = [message.userRole];
            }))
        );
    }

    ngOnDestroy() {
        this.subscription.unsubscribe();
    }

    loadPolicy() {
        const policyId = this.route.snapshot.params['id'];
        if (policyId && this.policyId == policyId) {
            return;
        }
        if (!policyId) {
            this.policyId = policyId;
            this.policy = null;
            this.policyInfo = null;
            this.loading = false;
            return;
        }

        this.policyId = policyId;
        this.policy = null;
        this.policyInfo = null;
        this.isConfirmed = false;
        this.loading = true;
        this.profileService.getProfile().subscribe((profile: IUser | null) => {
            this.isConfirmed = !!(profile && profile.confirmed);
            this.role = profile ? profile.role : null;
            if (this.isConfirmed) {
                this.loadPolicyById(this.policyId);
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
            this.policyEngineService.policy(policyId)
        ]).subscribe((value) => {
            this.policy = value[0];
            this.policyInfo = value[1];
            this.virtualUsers = [];
            if (this.policyInfo?.status === 'DRY-RUN') {
                this.policyEngineService.getVirtualUsers(this.policyInfo.id).subscribe((users) => {
                    this.virtualUsers = users;
                    setTimeout(() => {
                        this.loading = false;
                    }, 500);
                }, (e) => {
                    this.loading = false;
                });
            } else {
                setTimeout(() => {
                    this.loading = false;
                }, 500);
            }
        }, (e) => {
            this.loading = false;
        });
    }

    createVirtualUser() {
        this.loading = true;
        this.policyEngineService.createVirtualUser(this.policyInfo.id).subscribe((users) => {
            this.virtualUsers = users;
            setTimeout(() => {
                this.loading = false;
            }, 500);
        }, (e) => {
            this.loading = false;
        });
    }

    setVirtualUser(item: any) {
        this.loading = true;
        this.policyEngineService.loginVirtualUser(this.policyInfo.id, item.did).subscribe((users) => {
            this.virtualUsers = users;
            this.policy = null;
            this.policyInfo = null;
            this.loadPolicyById(this.policyId);
        }, (e) => {
            this.loading = false;
        });
    }

    restartDryRun() {
        this.loading = true;
        this.policyEngineService.restartDryRun(this.policyInfo.id).subscribe((users) => {
            this.policy = null;
            this.policyInfo = null;
            this.loadPolicyById(this.policyId);
        }, (e) => {
            this.loading = false;
        });
    }

    onView(view: string) {
        this.view = view;
        if (this.view) {
            this.loading = true;
            this.policyEngineService.loadTransactions(this.policyInfo.id).subscribe((transactions) => {
                setTimeout(() => {
                    this.loading = false;
                }, 500);
            }, (e) => {
                this.loading = false;
            });
        }
    }
}
