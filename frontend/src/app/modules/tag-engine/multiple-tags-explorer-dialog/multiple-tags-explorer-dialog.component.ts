import { Component } from '@angular/core';
import { TagCreateDialog } from '../tags-create-dialog/tags-create-dialog.component';
import { TagsService } from 'src/app/services/tag.service';
import { TagsHistory } from '../models/tags-history';
import { TagMapItem } from '../models/tag-map-item';
import { TagItem } from '../models/tag-item';
import moment from 'moment';
import { VCViewerDialog } from '../../schema-engine/vc-dialog/vc-dialog.component';
import { DialogService, DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { LocationType, UserPermissions } from '@guardian/interfaces';

/**
 * Dialog for creating tags.
 */
@Component({
    selector: 'multiple-tags-explorer-dialog',
    templateUrl: './multiple-tags-explorer-dialog.component.html',
    styleUrls: ['./multiple-tags-explorer-dialog.component.scss']
})
export class MultipleTagsExplorerDialog {
    public loading = false;
    public started = false;
    public title: string = 'Tags';
    public description: string = '';
    public select: TagMapItem | undefined;
    public open: TagItem | undefined;
    public histories: TagsHistory[] = [];
    public owner: string;
    public time: string | undefined;
    public tab: number = 1;
    public tagsService: TagsService;
    public schemas: any[] = [];
    public hasChanges: boolean = false;
    public selectedTags: TagMapItem[] = [];
    public user: UserPermissions;

    public items: any[] = []

    public get canCreate(): boolean {
        if (this.user) {
            return (
                this.user.TAGS_TAG_CREATE &&
                this.user.location !== LocationType.REMOTE &&
                !this.histories.some(item => item.location === LocationType.REMOTE)
            );
        } else {
            return true;
        }
    }

    constructor(
        public dialogRef: DynamicDialogRef,
        public dialog: DialogService,
        public dialogData: DynamicDialogConfig
    ) {
        this.schemas = dialogData.data?.schemas;
        this.tagsService = dialogData.data?.service;
        this.histories = dialogData.data?.histories;
        this.user = dialogData.data?.user;
        // this.selectedTags = this.history.items;
        this.items = dialogData.data?.items;

        console.log(this.items);
        

        // this.owner = this.history.owner;
        // this.select = this.history.getItem();
        // this.setTime(this.history.time);
        // this.tab = 1;

        // if (!this.select) {
        //     this.select = this.history.getHistory();
        // }
        // if (!this.selectedTags || this.selectedTags.length === 0) {
        //     this.selectedTags = this.history.history;
        //     this.tab = 2;
        // }
    }

    ngOnInit() {
        this.started = true;
    }

    onClose(): void {
        this.dialogRef.close();
    }

    onNoClick(): void {
        this.dialogRef.close(this.hasChanges);
    }

    public onSelect(item: TagMapItem) {
        this.select = item;
    }

    public onOpen(item: TagItem) {
        if (item.open) {
            item.open = false;
        } else {
            item.open = true;
        }
    }

    public onAdd(block: any) {
        const history = this.histories.find(item => item.target === block.policyId + '#' + block.id);

        console.log(history);
        console.log(this.histories);
        console.log(block);
        
        if (history) {
            const dialogRef = this.dialog.open(TagCreateDialog, {
                width: '570px',
                closable: true,
                header: 'New Tag',
                data: {
                    schemas: this.schemas
                }
            });
            dialogRef.onClose.subscribe(async (result) => {
                if (result) {
                    this.create(result, history);
                }
            });
        }
    }

    private create(tag: any, history: TagsHistory) {
        tag = history.create(tag);
        this.loading = true;
        this.tagsService.create(tag).subscribe((data) => {
            history.add(data);
            if (this.tab === 1) {
                this.select = history.getItem(this.select);
            } else {
                this.select = history.getHistory(this.select);
            }
            history.updateItems();
            setTimeout(() => {
                this.loading = false;
                this.hasChanges = true;
                this.tagsService.tagsUpdated$.next();
            }, 500);
        }, (e) => {
            console.error(e.error);
            this.loading = false;
            this.hasChanges = false;
        });
    }

    private createMultiple(tag: any, histories: TagsHistory[]) {
        for (const history of histories) {
            tag = history.create(tag);
            this.loading = true;
            this.tagsService.create(tag).subscribe((data) => {
                history.add(data);
                if (this.tab === 1) {
                    this.select = history.getItem(this.select);
                } else {
                    this.select = history.getHistory(this.select);
                }
                history.updateItems();
                setTimeout(() => {
                    this.loading = false;
                    this.hasChanges = true;
                    this.tagsService.tagsUpdated$.next();
                }, 500);
            }, (e) => {
                console.error(e.error);
                this.loading = false;
                this.hasChanges = false;
            });
        }
    }


    public onDelete($event: MouseEvent, item: TagItem, history: TagsHistory) {
        this.loading = true;
        this.tagsService.delete(item.uuid).subscribe((data) => {
            history.delete(item);
            if (this.tab === 1) {
                this.select = history.getItem(this.select);
            } else {
                this.select = history.getHistory(this.select);
            }
            setTimeout(() => {
                this.loading = false;
                this.hasChanges = true;
                this.tagsService.tagsUpdated$.next();
            }, 500);
        }, (e) => {
            console.error(e.error);
            this.loading = false;
            this.hasChanges = false;
        });
    }

    public onUpdate(history: TagsHistory) {
        this.loading = true;
        this.tagsService.synchronization(history.entity, history.target).subscribe((data) => {
            history.setData(data.tags);
            history.setDate(data.refreshDate);
            if (this.tab === 1) {
                this.select = history.getItem(this.select);
            } else {
                this.select = history.getHistory(this.select);
            }
            this.setTime(history.time);
            setTimeout(() => {
                this.loading = false;
            }, 500);
        }, (e) => {
            console.error(e.error);
            this.loading = false;
        });
    }

    private setTime(time: string | undefined) {
        if (time) {
            const m = moment(time);
            if (m.isValid()) {
                this.time = m.fromNow();
            } else {
                this.time = undefined;
            }
        } else {
            this.time = undefined;
        }
    }

    public hasHistoryItems(block: any): boolean {
        return Array.isArray(this.getHistoryItems(block)) && this.getHistoryItems(block).length > 0
    }

    public getHistoryItems(block: any): TagMapItem[] {
        const history = this.histories.find(item => item.target === block.policyId + '#' + block.id);
        return history?.items || [];
    }
    
    public onTagDelete(block: any) {
        console.log(block);
        
    }

    public onAddForAllSelected() {
        const dialogRef = this.dialog.open(TagCreateDialog, {
            width: '570px',
            closable: true,
            header: 'New Tag',
            data: {
                entities: this.items,
                schemas: this.schemas,
            }
        });
        dialogRef.onClose.subscribe(async (result) => {
            if (result) {
                this.createMultiple(result, this.histories);
            }
        });
    }
}
