import { Component } from '@angular/core';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { UserPermissions } from '@guardian/interfaces';
import { SchemaService } from '../../../services/schema.service';
import { ProfileService } from 'src/app/services/profile.service';

/**
 * Dialog for display json
 */
@Component({
    selector: 'transactions-dialog',
    templateUrl: './transaction-dialog.html',
    styleUrls: ['./transaction-dialog.scss']
})
export class TransactionDialogComponent{
    public title: string = '';
    public transactions: any[]
    public user: UserPermissions = new UserPermissions();

    constructor(
        public dialogRef: DynamicDialogRef,
        public dialogConfig: DynamicDialogConfig,
        private schemaService: SchemaService,
        private profileService: ProfileService,
    ) {
    }

    ngOnInit() {
        const {
            title,
            transactions
        } = this.dialogConfig.data;

        this.title = title;
        this.transactions = transactions;
    }

    formattedTransaction(transactionId: string) {
        console.log(this.transactions);
        return transactionId.replace(/^(\d\.\d\.\d+)@(\d+)\.(\d+)$/, '$1-$2-$3');
    }

    public onClose(): void {
        this.dialogRef.close(null);
    }
}
