import { Component, EventEmitter, Inject, Input, Output, SimpleChanges } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { IPFS_SCHEMA } from 'src/app/services/api';
import { IPFSService } from 'src/app/services/ipfs.service';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import moment from 'moment';
import { DropdownChangeEvent } from 'primeng/dropdown';

class AttachedFile {
    public readonly name: string;
    public readonly type: string;
    public readonly size: number;
    public link: string;
    public cid: string;
    public loaded: boolean;
    public error: boolean;

    private readonly _file: File;

    constructor(file: File) {
        this.name = file.name;
        this.type = file.type;
        this.size = file.size;
        this.link = '';
        this.cid = '';
        this.loaded = false;
        this.error = false;
        this._file = file;
    }

    public upload(
        ipfs: IPFSService,
        policyId?: string,
        dryRun?: boolean,
        callback?: Function
    ) {
        this.loaded = false;
        this.error = false;
        let addFileObs;
        if (dryRun && policyId) {
            addFileObs = ipfs.addFileDryRun(this._file, policyId);
        } else {
            addFileObs = ipfs.addFile(this._file);
        }
        addFileObs
            .subscribe((res) => {
                this.link = IPFS_SCHEMA + res;
                this.cid = res;
                this.loaded = true;
                this.error = false;
                if (callback) {
                    callback();
                }
            }, (error) => {
                this.loaded = true;
                this.error = true;
                if (callback) {
                    callback();
                }
            });
    }

    public toJSON() {
        return {
            name: this.name,
            type: this.type,
            size: this.size,
            link: this.link,
            cid: this.cid,
        }
    }
}

class DataList {
    public data: any[];
    public count: number;
    public full: boolean;
    public needUpdate: boolean;

    constructor() {
        this.data = [];
        this.count = 0;
        this.full = true;
        this.needUpdate = false;
    }

    public setData(data: any[], count: number) {
        this.data = Array.isArray(data) ? data : [];
        this.count = count;
        this.full = this.data.length === count;
        this.needUpdate = false;
    }

    public after(data: any[], count: number, target?: string): boolean {
        data = Array.isArray(data) ? data : [];

        const index = this.data.findIndex((d) => d.id === target);
        if (index !== -1) {
            this.data = this.data.slice(0, index + 1);
        }
        this.data = this.data.concat(data);

        if (this.count !== count) {
            this.count = count;
            this.needUpdate = true;
        }
        this.full = this.data.length === count;
        return this.full;
    }

    public before(data: any[], count: number, target?: string) {
        data = Array.isArray(data) ? data : [];

        const index = this.data.findIndex((d) => d.id === target);
        if (index !== -1) {
            this.data = this.data.slice(index);
        }
        this.data = data.concat(this.data);

        this.needUpdate = false;
        this.count = count;
        this.full = this.data.length === count;

        return this.needUpdate;
    }

    public getLast() {
        return this.data[this.data.length - 1];
    }
}

/**
 * Dialog for icon preview.
 */
@Component({
    selector: 'policy-comments',
    templateUrl: './policy-comments.component.html',
    styleUrls: ['./policy-comments.component.scss']
})
export class PolicyComments {
    @Input('policy-id') policyId!: string | undefined;
    @Input('document-id') documentId!: string | undefined;

    public loading: boolean = true;
    public data: DataList;

    public textMessage: string;
    public files: AttachedFile[];
    public currentVisibility: any;
    public sendDisabled: boolean;

    public readonly visibility = [
        {
            label: 'All',
            value: 'all',
            items: [{
                label: 'All',
                value: 'all'
            }],
        },
        {
            label: 'Roles',
            value: 'role',
            items: [{
                label: 'Installer',
                value: 'Installer'
            },
            {
                label: 'Administrator',
                value: 'Administrator'
            }],
        },
        {
            label: 'Users',
            value: 'User',
            items: [{
                label: 'StandardRegistry',
                value: 'StandardRegistry'
            },
            {
                label: 'Installer',
                value: 'Installer'
            }, {
                label: 'Installer 2',
                value: 'Installer 2'
            }],
        }
    ]

    private _destroy$ = new Subject<void>();

    constructor(
        private policyEngineService: PolicyEngineService,
        private ipfs: IPFSService,
    ) {
        this.data = new DataList();
        this.loading = true;

        this.textMessage = '';
        this.files = [];
        this.currentVisibility = 'all';
        this.sendDisabled = true;
    }

    ngOnInit(): void {
        console.log(this);
    }

    ngOnChanges(changes: SimpleChanges) {
        this.loadComments('load');
    }

    ngOnDestroy(): void {

    }

    private getFilters(
        type: 'load' | 'update' | 'more',
        target?: string
    ): any {
        const filters: any = {

        };
        if (type === 'load') {
            return filters;
        } else if (type === 'more') {
            filters.lt = target;
            return filters;
        } else if (type === 'update') {
            filters.gt = target;
            return filters;
        }
    }

    private loadComments(
        type: 'load' | 'update' | 'more',
        target?: string
    ) {
        if (!this.policyId || !this.documentId) {
            this.loading = false;
            this.data.setData([], 0);
            return;
        }

        this.loading = true;
        const filter = this.getFilters(type, target);
        this.policyEngineService
            .getPolicyComments(
                this.policyId,
                this.documentId,
                filter
            )
            .pipe(takeUntil(this._destroy$))
            .subscribe((response) => {
                const data = response.body || [];
                const count = Number(response.headers.get('X-Total-Count')) || data.length;
                if (type === 'load') {
                    this.data.setData(data, count);
                } else if (type === 'more') {
                    this.data.after(data, count, target);
                } else if (type === 'update') {
                    this.data.before(data, count);
                }
                setTimeout(() => {
                    this.loading = false;
                }, 500);
            }, (e) => {
                this.loading = false;
            });
    }

    public onSend() {
        if (!this.policyId || !this.documentId) {
            this.loading = false;
            return;
        }

        const data = {
            // anchor?: string;
            // recipient?: string;
            // recipientRole?: string;
            text: this.textMessage,
            files: this.files.map((f) => f.toJSON())
        };
        this.loading = true;
        this.policyEngineService
            .createPolicyComment(
                this.policyId,
                this.documentId,
                data
            ).subscribe((response) => {
                this.loadComments('update');
            }, (e) => {
                this.loading = false;
            });
    }

    public onDrop($event: any) {
        $event.preventDefault();
        const results: AttachedFile[] = [];
        if ($event.dataTransfer?.items?.length) {
            for (let index = 0; index < $event.dataTransfer.items.length; index++) {
                const item = $event.dataTransfer.items[index];
                if (item.kind === "file") {
                    const file = item.getAsFile();
                    const result = new AttachedFile(file);
                    results.push(result)
                }
            }
        }
        for (const result of results) {
            result.upload(this.ipfs, this.policyId, false, this.onText.bind(this));
        }
        for (const result of results) {
            this.files.push(result);
        }
    }

    public getSize(bytes: number): string {
        if (bytes === 0) {
            return "0 Bytes";
        }
        const sizes = ["Bytes", "Kb", "Mb", "Gb", "Tb"];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return (bytes / Math.pow(1024, i)).toFixed(1) + " " + sizes[i];
    }

    public getDate(date: string) {
        const momentDate = moment(date);
        if (momentDate.isValid()) {
            return momentDate.format("MMM DD, HH:mm");
        } else {
            return 'N\\A';
        }
    }

    public onDeleteFile(file: AttachedFile) {
        this.files = this.files.filter(f => f !== file);
    }

    public onChangeVisibility($event: DropdownChangeEvent) {
        debugger;
    }

    public onText() {
        setTimeout(() => {
            this.updateDisabled();
        });
    }

    public updateDisabled() {
        if (this.files.length) {
            for (const file of this.files) {
                if (!file.loaded) {
                    this.sendDisabled = true;
                    return;
                }
            }
            this.sendDisabled = false;
            return;
        } else if (this.textMessage) {
            this.sendDisabled = false;
            return;
        } else {
            this.sendDisabled = true;
            return;
        }
    }

    public onMore() {
        const last = this.data.getLast();
        this.loadComments('more', last?.id);
    }
}