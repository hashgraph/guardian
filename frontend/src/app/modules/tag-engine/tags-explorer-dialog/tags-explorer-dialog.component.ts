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
 * Dialog for creating tokens.
 */
@Component({
    selector: 'tags-explorer-dialog',
    templateUrl: './tags-explorer-dialog.component.html',
    styleUrls: ['./tags-explorer-dialog.component.scss']
})
export class TagsExplorerDialog {
    public loading = false;
    public started = false;
    public title: string = 'Tags';
    public description: string = '';
    public select: TagMapItem | undefined;
    public open: TagItem | undefined;
    public history: TagsHistory;
    public owner: string;
    public time: string | undefined;
    public tab: number = 1;
    public tagsService: TagsService;
    public schemas: any[] = [];
    public hasChanges: boolean = false;
    public selectedTags: TagMapItem[] = [];
    public user: UserPermissions;
    public inheritTagsOption: boolean = false;

    public get canCreate(): boolean {
        if (this.user) {
            return (
                this.user.TAGS_TAG_CREATE &&
                this.user.location !== LocationType.REMOTE &&
                this.history.location !== LocationType.REMOTE
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
        this.history = dialogData.data?.history;
        this.user = dialogData.data?.user;
        this.selectedTags = this.history.items;
        this.inheritTagsOption = dialogData.data?.inheritTagsOption;

        this.owner = this.history.owner;
        this.select = this.history.getItem();
        this.setTime(this.history.time);
        this.tab = 1;

        if (!this.select) {
            this.select = this.history.getHistory();
        }
        if ((this.history.history && this.history.history.length > 0) && (!this.selectedTags || this.selectedTags.length === 0)) {
            this.selectedTags = this.history.history;
            this.tab = 2;
        }
    }

    ngOnInit() {
        this.started = true;
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

    public onAdd() {
        const dialogRef = this.dialog.open(TagCreateDialog, {
            width: '570px',
            closable: true,
            header: this.title,
            data: {
                schemas: this.schemas,
                inheritTagsOption: this.inheritTagsOption,
            }
        });
        dialogRef.onClose.subscribe(async (result) => {
            if (result) {
                this.create(result);
            }
        });
    }

    private create(tag: any) {
        tag = this.history.create(tag);
        this.loading = true;

        this.tagsService.create(tag).subscribe((data) => {
            this.history.add(data);

            if (this.tab === 1) {
                this.select = this.history.getItem(this.select);
            } else {
                this.select = this.history.getHistory(this.select);
            }

            this.history.updateItems();

            setTimeout(() => {
                this.loading = false;
                this.hasChanges = true;
                this.tagsService.tagsUpdated$.next();
                this.openTab(this.tab);
            }, 500);
        }, (e) => {
            console.error(e.error);
            this.loading = false;
            this.hasChanges = false;
        });
    }

    public onDelete($event: MouseEvent, item: TagItem) {
        this.loading = true;
        this.tagsService.delete(item.uuid).subscribe((data) => {
            this.history.delete(item);
            if (this.tab === 1) {
                this.select = this.history.getItem(this.select);
            } else {
                this.select = this.history.getHistory(this.select);
            }
            setTimeout(() => {
                this.loading = false;
                this.hasChanges = true;
                this.tagsService.tagsUpdated$.next();
                this.openTab(this.tab);
            }, 500);
        }, (e) => {
            console.error(e.error);
            this.loading = false;
            this.hasChanges = false;
        });
    }

    public onUpdate() {
        this.loading = true;
        this.tagsService.synchronization(this.history.entity, this.history.target, this.history.linkedItems).subscribe((data) => {
            this.history.setData(data.tags);
            this.history.setDate(data.refreshDate);
            if (this.tab === 1) {
                this.select = this.history.getItem(this.select);
            } else {
                this.select = this.history.getHistory(this.select);
            }
            this.setTime(this.history.time);
            setTimeout(() => {
                this.loading = false;
            }, 500);
        }, (e) => {
            console.error(e.error);
            this.loading = false;
        });
    }

    public openTab(tab: number) {
        this.tab = tab;
        if (this.tab === 1) {
            this.select = this.history.getItem();
            this.selectedTags = this.history.items;
        } else {
            this.select = this.history.getHistory();
            this.selectedTags = this.history.history;
        }
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

    public json(doc: any): string {
        return JSON.stringify(doc, null, 2);
    }

    public openVCDocument(item: any, title: string) {
        const dialogRef = this.dialog.open(VCViewerDialog, {
            showHeader: false,
            width: '1000px',
            styleClass: 'guardian-dialog',
            data: {
                id: item.id,
                row: item,
                dryRun: !!item.dryRunId,
                document: item.document,
                title,
                type: 'VC',
                viewDocument: true,
                toggle: true
            }
        });
        dialogRef.onClose.subscribe(async (result) => { });
    }
}
