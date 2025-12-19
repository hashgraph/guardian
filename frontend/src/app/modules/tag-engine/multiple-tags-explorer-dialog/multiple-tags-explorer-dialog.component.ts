import { Component } from '@angular/core';
import { TagCreateDialog } from '../tags-create-dialog/tags-create-dialog.component';
import { TagsService } from 'src/app/services/tag.service';
import { TagsHistory } from '../models/tags-history';
import { TagMapItem } from '../models/tag-map-item';
import { TagItem } from '../models/tag-item';
import moment from 'moment';
import { VCViewerDialog } from '../../schema-engine/vc-dialog/vc-dialog.component';
import { DialogService, DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { LocationType, TagType, UserPermissions } from '@guardian/interfaces';

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
    public open: TagItem | undefined;
    public histories: TagsHistory[] = [];
    public owner: string;
    public time: string | undefined;
    public tab: number = 1;
    public tagsService: TagsService;
    public schemas: any[] = [];
    public hasChanges: boolean = false;
    public user: UserPermissions;
    public commonHistory: TagsHistory;

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
        this.items = dialogData.data?.items;
        this.commonHistory = dialogData.data?.commonHistory;
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

    public onOpen(item: TagItem) {
        if (item.open) {
            item.open = false;
        } else {
            item.open = true;
        }
    }

    public onAdd(block: any) {
        const history = this.histories.find(item => item.target === this.commonHistory.target && item.linkedItems.includes(block.id));
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

    private createMultiple(tag: TagItem, histories: TagsHistory[]) {
        const newTag = this.commonHistory.create(tag);
        this.loading = true;
        this.tagsService.create(newTag).subscribe((data) => {
            for (const history of histories) {
                history.add(data);
                history.updateItems();
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

    public getHistory(block: any): TagsHistory | undefined {
        const history = this.histories.find(item => item.linkedItems.includes(block.id));
        return history;
    }

    public getHistoryItems(block: any): TagItem[] {
        const history = this.histories.find(item => item.linkedItems.includes(block.id));
        return history?.items.reduce((result: TagItem[], items) => {
            return result.concat(items.items || []);
        }, []) || [];
    }

    public onTagDelete(block: any, item: TagItem) {
        const history = this.getHistory(block);
        if (!history) {
            return;
        }

        this.loading = true;
        this.tagsService.delete(item.uuid).subscribe((data) => {
            this.histories.filter(history => history)
            history.delete(item);
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
