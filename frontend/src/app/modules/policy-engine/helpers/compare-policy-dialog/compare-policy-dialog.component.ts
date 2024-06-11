import { Component } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { CompareStorage } from 'src/app/services/compare-storage.service';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';

interface IItem {
    name: string;
    type: string;
    value: any;
}

@Component({
    selector: 'compare-policy-dialog',
    templateUrl: './compare-policy-dialog.component.html',
    styleUrls: ['./compare-policy-dialog.component.scss'],
})
export class ComparePolicyDialog {
    public loading = true;
    public first: IItem | undefined;
    public items: IItem[] = [];
    public localItems: any[] = [];
    public fixed: boolean = false;
    public type: string = 'id';
    public messageForm = new FormGroup({
        messageId: new FormControl('', Validators.required)
    }, (fg) => {
        for (const key in (fg as FormGroup).controls) {
            if (!fg.get(key)) {
                continue;
            }
            const value = fg.get(key)?.value;
            if (value && /^([0-9]{10})(\.?)([0-9]{9})$/.test(value)) {
                return null;
            }
        }
        return {
            policyName: 'Invalid message id'
        };
    });
    public localIds: any[] = [];

    constructor(
        public ref: DynamicDialogRef,
        public config: DynamicDialogConfig,
        private policyEngineService: PolicyEngineService,
        private compareStorage: CompareStorage
    ) {
        const policy = this.config.data.policy;
        if (policy) {
            this.first = {
                value: policy.id,
                name: policy.name,
                type: 'id'
            }
            this.fixed = true;
        }
    }

    ngOnInit() {
        this.loading = true;
        this.policyEngineService.all()
            .subscribe((policies) => {
                this.localItems = policies;
                setTimeout(() => {
                    this.loading = false;
                });
            }, (e) => {
                setTimeout(() => {
                    this.loading = false;
                });
            });
    }

    public onDelete(item: IItem, first: boolean) {
        if (first) {
            this.first = this.items.shift();
        } else {
            this.items = this.items.filter((e) => e.value !== item.value);
        }
    }

    public onChangeType(type: string) {
        this.type = type;
    }

    public addMessage() {
        const messageId = this.messageForm.value.messageId
            .replace(/^([0-9]{10})(\.?)([0-9]{9})$/, '$1.$3');
        const item: IItem = {
            name: messageId,
            type: 'message',
            value: messageId
        }
        if (this.addItem(item)) {
            this.messageForm.setValue({ messageId: '' });
        }
    }

    public importFromFile(file: any) {
        const reader = new FileReader();
        reader.readAsArrayBuffer(file);
        reader.addEventListener('load', (e: any) => {
            const arrayBuffer = e.target.result;
            const value = this.compareStorage.saveFile(file.name, arrayBuffer);
            const item: IItem = {
                name: file.name,
                type: 'file',
                value
            }
            this.addItem(item);
        });
    }

    public addLocal() {
        for (const policy of this.localIds) {
            const item: IItem = {
                name: policy.name,
                type: 'id',
                value: policy.id
            }
            this.addItem(item);
        }
        this.localIds = [];
    }

    private addItem(item: IItem): boolean {
        if (this.first) {
            if (this.first.value === item.value) {
                return false;
            }
            if (this.items.length) {
                const old = this.items.find((e) => e.value === item.value);
                if (old) {
                    return false;
                } else {
                    this.items.push(item);
                }
            } else {
                this.items.push(item);
            }
        } else {
            this.first = item;
        }
        return true;
    }

    public onClose(): void {
        this.ref.close(null);
    }

    public onCompare() {
        if (!this.items.length) {
            return;
        }
        const items = [];
        if (this.first) {
            items.push({
                type: this.first.type,
                value: this.first.value
            })
        }
        for (const item of this.items) {
            items.push({
                type: item.type,
                value: item.value
            })
        }
        this.ref.close(items);
    }
}
