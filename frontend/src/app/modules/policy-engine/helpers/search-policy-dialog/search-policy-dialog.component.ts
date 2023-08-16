import {
    AfterContentChecked, AfterContentInit,
    AfterViewChecked,
    AfterViewInit,
    Component,
    Inject,
    OnInit,
    ViewChild
} from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Router } from '@angular/router';

/**
 * Search policy dialog.
 */
@Component({
    selector: 'search-policy-dialog',
    templateUrl: './search-policy-dialog.component.html',
    styleUrls: ['./search-policy-dialog.component.scss']
})
export class SearchPolicyDialog implements OnInit, AfterContentInit {
    loading = false;
    initDialog = false;
    header: string;
    policyId: string;
    list: any[];
    count: number = 0;
    _list: any[];

    constructor(
        public dialogRef: MatDialogRef<SearchPolicyDialog>,
        private router: Router,
        @Inject(MAT_DIALOG_DATA) public data: any
    ) {
        this.header = data.header;
        this.policyId = data.policyId;
        this.list = data.list || [];
        this._list = this.list;
    }

    ngOnInit() {
        this.count = 1;
        if (this.list) {
            for (const item of this.list) {
                if (item.rate > 80) {
                    item._color = 'item-color-green';
                } else if (item.rate > 50) {
                    item._color = 'item-color-yellow';
                } else {
                    item._color = 'item-color-red';
                }
                item._tags = item.tags.join(', ');
                item._search = `${item.name} ${item._tags}`.toLowerCase();
            }
        }
    }

    ngAfterContentInit() {
        setTimeout(() => {
            this.initDialog = true;
        }, 100);
    }

    public onOk(): void {
        this.dialogRef.close();
    }

    public onSelect() {
        this.count = 1;
        if (this.list) {
            for (const item of this.list) {
                if (item._select) {
                    this.count++;
                }
            }
        }
    }

    public onCompare() {
        if (!this.list || this.count < 2) {
            return;
        }
        const policies = this.list.filter(item => item._select);
        const policyIds = policies.map(p => p.id);
        policyIds.unshift(this.policyId);
        if (policyIds.length > 1) {
            this.dialogRef.close();
            if (policyIds.length === 2) {
                this.router.navigate(['/compare'], {
                    queryParams: {
                        type: 'policy',
                        policyId1: policyIds[0],
                        policyId2: policyIds[1]
                    }
                });
            } else {
                this.router.navigate(['/compare'], {
                    queryParams: {
                        type: 'multi-policy',
                        policyIds: policyIds,
                    }
                });
            }
        }
    }

    public select(item: any) {
        item._select = !item._select;
        this.onSelect();
    }

    public onSearch(event: any) {
        const value = (event?.target?.value || '').toLowerCase();
        if (this.list && value) {
            this._list = this.list
                .filter(p => p._search.indexOf(value) !== -1);
        } else {
            this._list = this.list;
        }
    }
}
