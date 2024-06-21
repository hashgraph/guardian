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
    public localItemsFiltered: any[] = [];
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
    public policyName: string = '';
    public messageIdError: boolean = false;
    private policyMap: Set<string> = new Set<string>();

    public get count(): number {
        if (this.first) {
            return this.items.length + 1;
        }
        return this.items.length;
    }

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
                this.localItems = policies || [];
                for (const policy of this.localItems) {
                    policy._selected = false;
                    policy._search = (policy.name || '').toLowerCase();
                }
                this.onFilterPolicy();
                setTimeout(() => {
                    this.loading = false;
                });
            }, (e) => {
                setTimeout(() => {
                    this.loading = false;
                });
            });
        this.messageForm.valueChanges.subscribe(() => {
            this.messageIdError = false;
        });
        this.updateMap();
    }

    public onDelete(item: IItem, first: boolean) {
        if (first) {
            this.first = this.items.shift();
        } else {
            this.items = this.items.filter((e) => e.value !== item.value);
        }
        this.updateMap();
    }

    private addItem(item: IItem): boolean {
        let result = false;
        if (this.first) {
            if (this.first.value === item.value) {
                result = false;
            } else if (this.items.length) {
                const old = this.items.find((e) => e.value === item.value);
                if (old) {
                    result = false;
                } else {
                    this.items.push(item);
                    result = true;
                }
            } else {
                this.items.push(item);
                result = true;
            }
        } else {
            this.first = item;
            result = true;
        }
        this.updateMap();
        return result;
    }

    private updateMap() {
        this.policyMap.clear();
        if (this.first && this.first.type === 'id') {
            this.policyMap.add(this.first.value);
        }
        for (const item of this.items) {
            if (item.type === 'id') {
                this.policyMap.add(item.value);
            }
        }
    }

    public onChangeType(type: string) {
        this.type = type;
    }

    public addMessage() {
        if (this.messageForm.invalid) {
            return;
        }
        const messageId = this.messageForm.value.messageId
            .replace(/^([0-9]{10})(\.?)([0-9]{9})$/, '$1.$3');

        this.loading = true;
        this.policyEngineService.previewByMessage(messageId)
            .subscribe((preview) => {
                const item: IItem = {
                    name: messageId,
                    type: 'message',
                    value: messageId
                }
                if (this.addItem(item)) {
                    this.messageForm.setValue({ messageId: '' });
                }
                this.messageIdError = false;
                setTimeout(() => {
                    this.loading = false;
                });
            }, (e) => {
                this.messageIdError = true;
                setTimeout(() => {
                    this.loading = false;
                });
            });
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
        // for (const policy of this.localIds) {
        //     const item: IItem = {
        //         name: policy.name,
        //         type: 'id',
        //         value: policy.id
        //     }
        //     this.addItem(item);
        // }
        for (const policy of this.localItems) {
            if (policy._selected) {
                const item: IItem = {
                    name: policy.name,
                    type: 'id',
                    value: policy.id
                }
                this.addItem(item);
                policy._selected = false;
            }
        }
        this.localIds = [];
        this.onFilterPolicy();
    }

    public onSelectLocalItem(item: any) {
        item._selected = !item._selected;
        this.localIds = this.localItems.filter((p) => p._selected);
    }

    public onFilterPolicy() {
        const text = (this.policyName?.toLowerCase() || '').trim();
        if (text) {
            this.localItemsFiltered = this.localItems
                .filter((p) => p._search.indexOf(text) !== -1 && !this.policyMap.has(p.id));
        } else {
            this.localItemsFiltered = this.localItems
                .filter((p) => !this.policyMap.has(p.id));
        }
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
