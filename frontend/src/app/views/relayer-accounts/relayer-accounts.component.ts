import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UserPermissions } from '@guardian/interfaces';
import { forkJoin, Subscription } from 'rxjs';
import { ProfileService } from 'src/app/services/profile.service';
import { DialogService } from 'primeng/dynamicdialog';
import { RelayerAccountsService } from 'src/app/services/relayer-accounts.service';
import { RelayerAccountDetailsDialog } from 'src/app/components/relayer-account-details-dialog/relayer-account-details-dialog.component';
import moment from 'moment';

interface IColumn {
    id: string;
    title: string;
    type: string;
    size: string;
    tooltip: boolean;
    permissions?: (user: UserPermissions) => boolean;
    canDisplay?: () => boolean;
}

@Component({
    selector: 'app-relayer-accounts',
    templateUrl: './relayer-accounts.component.html',
    styleUrls: ['./relayer-accounts.component.scss'],
})
export class RelayerAccountsComponent implements OnInit {
    public readonly title: string = 'Relayer Accounts';

    public loading: boolean = true;
    public isConfirmed: boolean = false;
    public user: UserPermissions = new UserPermissions();
    public owner: string;
    public page: any[];
    public pageIndex: number;
    public pageSize: number;
    public pageCount: number;
    public columns: IColumn[];
    public currentRelayerAccount: any;
    public balances: Map<string, string>;
    public search: string;

    private subscription = new Subscription();

    constructor(
        private profileService: ProfileService,
        private relayerAccountsService: RelayerAccountsService,
        private dialogService: DialogService,
        private router: Router,
        private route: ActivatedRoute
    ) {
        this.balances = new Map<string, string>();
        this.columns = [{
            id: 'username',
            title: 'User Name',
            type: 'text',
            size: '200',
            tooltip: false
        }, {
            id: 'account',
            title: 'Account',
            type: 'text',
            size: '200',
            tooltip: false
        }, {
            id: 'balance',
            title: 'Balance',
            type: 'text',
            size: '200',
            tooltip: false
        }, {
            id: 'refresh',
            title: 'Update date',
            type: 'text',
            size: '200',
            tooltip: false
        }, {
            id: 'name',
            title: 'Name',
            type: 'text',
            size: 'auto',
            tooltip: false
        }];
    }

    ngOnInit() {
        this.page = [];
        this.pageIndex = 0;
        this.pageSize = 10;
        this.pageCount = 0;
        this.subscription.add(
            this.route.queryParams.subscribe((queryParams) => {
                this.loadProfile();
            })
        );
    }

    ngOnDestroy(): void {
        this.subscription.unsubscribe();
    }

    private loadProfile() {
        this.isConfirmed = false;
        this.loading = true;
        forkJoin([
            this.profileService.getProfile(),
            this.relayerAccountsService.getCurrentRelayerAccount(),
        ]).subscribe(([profile, current]) => {
            this.isConfirmed = !!(profile && profile.confirmed);
            this.user = new UserPermissions(profile);
            this.owner = this.user.did;
            this.currentRelayerAccount = current;

            if (this.isConfirmed) {
                this.loadRelayerAccounts();
            } else {
                setTimeout(() => {
                    this.loading = false;
                }, 500);
            }
        }, (e) => {
            this.loading = false;
        });
    }

    private loadRelayerAccounts() {
        const filters: any = {
            search: this.search
        };
        this.loading = true;
        this.relayerAccountsService
            .getUserRelayerAccounts(
                this.pageIndex,
                this.pageSize,
                filters
            )
            .subscribe((response) => {
                const { page, count } = this.relayerAccountsService.parsePage(response);
                this.page = page;
                this.pageCount = count;
                for (const row of this.page) {
                    row.account = this.getAccount(row) || '';
                    row.name = this.getAccountName(row);
                }
                setTimeout(() => {
                    this.loading = false;
                }, 500);
            }, (e) => {
                this.loading = false;
            });
    }

    public onPage(event: any): void {
        if (this.pageSize != event.pageSize) {
            this.pageIndex = 0;
            this.pageSize = event.pageSize;
        } else {
            this.pageIndex = event.pageIndex;
            this.pageSize = event.pageSize;
        }
        this.loadRelayerAccounts();
    }

    public onSearch() {
        this.loadRelayerAccounts();
    }

    public onOpen(item: any) {
        const dialogRef = this.dialogService.open(RelayerAccountDetailsDialog, {
            showHeader: false,
            width: '1100px',
            styleClass: 'guardian-dialog',
            data: {
                relayerAccount: item
            }
        });
        dialogRef.onClose.subscribe(async (result) => { });
    }

    public getBalance(row: any) {
        return this.balances.get(row.account) || '-';
    }

    public updateBalance(row: any) {
        row.__loading = true;
        this.relayerAccountsService
            .getRelayerAccountBalance(row.account)
            .subscribe((balance) => {
                this.balances.set(row.account, balance);
                row.__loading = false;
                row.__lastUpdate = moment(Date.now()).format("YYYY-MM-DD, HH:mm");
            }, (e) => {
                row.__balance = '-';
                row.__loading = false;
            });
    }

    public updateAllBalance() {
        for (const row of this.page) {
            this.updateBalance(row);
        }
    }

    public getAccountName(row: any) {
        if (row.relayerAccountId) {
            return row.relayerAccountName;
        } else {
            return 'Default';
        }
    }
    public getAccount(row: any) {
        if (row.relayerAccountId) {
            return row.relayerAccountId;
        } else {
            return row.hederaAccountId;
        }
    }
}