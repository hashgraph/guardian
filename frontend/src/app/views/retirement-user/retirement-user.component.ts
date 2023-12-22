import { Component, OnInit, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { ActivatedRoute, Router } from '@angular/router';
import { IStandardRegistryResponse, IUser, Schema, SchemaEntity, SchemaHelper, TagType, Token } from '@guardian/interfaces';
import { Dropdown } from 'primeng/dropdown';
import { DialogService } from 'primeng/dynamicdialog';
import { Subject, Subscription, forkJoin } from 'rxjs';
import { AddPairDialogComponent } from 'src/app/components/add-pair-dialog/add-pair-dialog.component';
import { DataInputDialogComponent } from 'src/app/components/data-input-dialog/data-input-dialog.component';
import { RetireTokenDialogComponent } from 'src/app/components/retire-token-dialog/retire-token-dialog.component';
import { VCViewerDialog } from 'src/app/modules/schema-engine/vc-dialog/vc-dialog.component';
import { AuthService } from 'src/app/services/auth.service';
import { ContractService } from 'src/app/services/contract.service';
import { DemoService } from 'src/app/services/demo.service';
import { HeaderPropsService } from 'src/app/services/header-props.service';
import { InformService } from 'src/app/services/inform.service';
import { ProfileService } from 'src/app/services/profile.service';
import { SchemaService } from 'src/app/services/schema.service';
import { TagsService } from 'src/app/services/tag.service';
import { TasksService } from 'src/app/services/tasks.service';
import { TokenService } from 'src/app/services/token.service';
import { WebSocketService } from 'src/app/services/web-socket.service';

interface Operation {
    label: string;
    description: string;
    action: (id: string) => void;
}

/**
 * Retirement page USER
 */
@Component({
    selector: 'app-retirement-user',
    templateUrl: './retirement-user.component.html',
    styleUrls: ['./retirement-user.component.scss'],
})
export class RetirementUserComponent implements OnInit {
    contracts: any[] | null;
    role!: any;
    pageIndex: number;
    pageSize: number;
    contractsCount: any = 0;

    loading: boolean = true;
    isConfirmed: boolean = false;
    isFailed: boolean = false;
    isNewAccount: boolean = false;
    noFilterResults: boolean = false;
    profile?: IUser | null;
    balance?: string | null;
    tokens?: Token[] | null;
    contractRequests: any[] | null;
    didDocument?: any;
    vcDocument?: any;
    standardRegistries: IStandardRegistryResponse[] = [];
    filteredRegistries: IStandardRegistryResponse[] = [];
    selectedIndex: number = 0;
    tagEntity = TagType.Token;
    owner: any;

    public innerWidth: any;
    public innerHeight: any;

    private subscription = new Subscription();
    private interval: any;

    @ViewChild('operationDropdown') operationDropdown: Dropdown;

    destroy$: Subject<boolean> = new Subject<boolean>();

    constructor(
        private auth: AuthService,
        public tagsService: TagsService,
        private dialogService: DialogService,
        private profileService: ProfileService,
        private contractsService: ContractService,
        private contractService: ContractService,
        private tokenService: TokenService,
        private router: Router,
        private otherService: DemoService,
        private schemaService: SchemaService,
        private informService: InformService,
        private taskService: TasksService,
        private webSocketService: WebSocketService,
        private route: ActivatedRoute,
        private headerProps: HeaderPropsService
    ) {
    }

    ngOnInit() {
        this.contractRequests = null;
        this.pageIndex = 0;
        this.pageSize = 10;

        this.innerWidth = window.innerWidth;
        this.innerHeight = window.innerHeight;
        this.loading = true;
        this.loadData();
        this.update();
    }

    ngOnDestroy() {
        this.subscription.unsubscribe();
        clearInterval(this.interval)
        this.destroy$.next(true);
        this.destroy$.unsubscribe();
    }

    private loadData() {
        this.balance = null;
        this.didDocument = null;
        this.vcDocument = null;
        this.loading = true;

        this.profileService.getProfile()
            .subscribe((result: IUser) => {
                this.profile = result;

                this.isConfirmed = !!this.profile.confirmed;
                this.isFailed = !!this.profile.failed;
                this.isNewAccount = !this.profile.didDocument;
                if (this.isConfirmed) {
                    this.didDocument = this.profile?.didDocument;
                    this.vcDocument = this.profile?.vcDocument;
                }
                this.owner = this.profile?.did;

                this.loadRetireData();

            }, ({message}) => {
                this.loading = false;
                this.headerProps.setLoading(false);
                console.error(message);
            });
    }

    private loadRetireData() {
        this.loading = true;
        this.contractService.getRetireRequestsPage(
            undefined,
            this.pageIndex,
            this.pageSize
        ).subscribe((response) => {
            this.contractRequests = response.body || [];
            this.contractsCount =
                response.headers.get('X-Total-Count') ||
                this.contractRequests.length;
            setTimeout(() => {
                this.loading = false;
                this.headerProps.setLoading(false);
            }, 200)
        }, ({message}) => {
            this.loading = false;
            this.headerProps.setLoading(false);
            console.error(message);
        });
    }

    update() {
        this.interval = setInterval(() => {
            if (!this.isConfirmed && !this.isNewAccount) {
                this.loadData();
            }
        }, 15000);
    }

    onChangePage(event: any) {
        if (this.pageSize != event.pageSize) {
            this.pageIndex = 0;
            this.pageSize = event.pageSize;
        } else {
            this.pageIndex = event.pageIndex;
            this.pageSize = event.pageSize;
        }
        this.loadData();
    }

    createRetireRequest() {
        this.loading = true;
        this.tokenService
            .getTokens()
            .subscribe(this.openRetireDialog.bind(this), ({message}) => {
                console.error(message);
                this.loading = false;
            });
    }

    openRetireDialog(tokens: any) {
        let dialogRef;
        if (this.innerWidth <= 810) {
            const bodyStyles = window.getComputedStyle(document.body);
            const headerHeight: number = parseInt(bodyStyles.getPropertyValue('--header-height'));
            dialogRef = this.dialogService.open(RetireTokenDialogComponent, {
                header: 'Create Retire Request',
                width: `${this.innerWidth.toString()}px`,
                height: `${this.innerHeight - headerHeight}px`,
                data: {
                    tokens,
                },
            });
        } else {
            dialogRef = this.dialogService.open(RetireTokenDialogComponent, {
                header: 'Create Retire Request',
                width: '800px',
                data: {
                    tokens,
                },
            });
        }
        dialogRef.onClose.subscribe(() => (this.loading = false));
        dialogRef.onClose.subscribe(async (result) => {
            if (result) {
                this.loading = true;
                this.contractService
                    .createRetireRequest(
                        result.contractId,
                        result.baseTokenId,
                        result.oppositeTokenId,
                        result.baseTokenCount,
                        result.oppositeTokenCount,
                        result.baseTokenSerials,
                        result.oppositeTokenSerials
                    )
                    .subscribe(
                        () => {
                            setTimeout(this.loadData.bind(this), 2000);
                        },
                        () => (this.loading = false)
                    );
            }
        });
    }

    cancelContractRequest(id: string) {
        this.loading = true;
        this.contractService.cancelContractRequest(id).subscribe(
            () => {
                setTimeout(this.loadData.bind(this), 2000);
            },
            () => (this.loading = false)
        );
    }

    viewRetireRequest(document: any) {
        this.dialogService.open(VCViewerDialog, {
            header: 'View Retire Request Result',
            width: '600px',
            data: {
                document: document.document,
                title: 'View Retire Request Result',
                type: 'VC',
                viewDocument: true
            }
        });
    }

    newOnPage() {
        this.pageIndex = 0;
        this.loadData();
    }

    movePageIndex(inc: number) {
        if (
            inc > 0 &&
            this.pageIndex < this.contractsCount / this.pageSize - 1
        ) {
            this.pageIndex += 1;
            this.loadData();
        } else if (inc < 0 && this.pageIndex > 0) {
            this.pageIndex -= 1;
            this.loadData();
        }
    }
}
