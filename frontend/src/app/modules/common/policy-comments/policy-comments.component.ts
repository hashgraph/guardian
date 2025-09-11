import { Component, EventEmitter, Inject, Input, Output, SimpleChanges, ViewChild } from '@angular/core';
import { forkJoin, Subject, takeUntil } from 'rxjs';
import { IPFSService } from 'src/app/services/ipfs.service';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import moment from 'moment';
import { DropdownChangeEvent } from 'primeng/dropdown';
import { AttachedFile } from './attached-file';
import { DataList } from './data-list';
import { ProfileService } from 'src/app/services/profile.service';
import { UserPermissions } from '@guardian/interfaces';

interface ListItem {
    label: string;
    value: string;
    search: string;
    type: string;
    role?: string;
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
    @Input('document-id') documentId!: any | undefined;
    @Input('policy-id') policyId!: any | undefined;
    @Input('field') field!: any | undefined;

    @ViewChild('messageContainer', { static: true }) messageContainer: any;

    public loading: boolean = true;
    public data: DataList;

    public user: UserPermissions = new UserPermissions();
    public owner: string;
    public policy: any;

    public textMessage: string;
    public files: AttachedFile[];
    public sendDisabled: boolean;

    public visibility: ListItem[] = [];
    public userNames = new Map<string, string>();
    public users: ListItem[] = [];

    private _destroy$ = new Subject<void>();
    public _findChoices = this.findChoices.bind(this);
    public _getChoiceLabel = this.getChoiceLabel.bind(this);

    constructor(
        private profileService: ProfileService,
        private policyEngineService: PolicyEngineService,
        private ipfs: IPFSService,
    ) {
        this.data = new DataList();
        this.loading = true;

        this.textMessage = '';
        this.files = [];
        // this.currentVisibility = '@all';
        this.sendDisabled = true;
    }

    ngOnInit(): void {
        console.log(this);
    }

    ngOnChanges(changes: SimpleChanges) {
        this.loading = true;
        this.loadProfile();
        this.updateTargets();
    }

    ngOnDestroy(): void {

    }

    private updateTargets() {
        this.userNames.clear();

        this.users = [];
        this.users.push({
            label: 'All',
            value: 'all',
            search: 'all',
            type: 'all',
        })
        if (this.policy && Array.isArray(this.policy.policyRoles)) {
            for (const role of this.policy.policyRoles) {
                this.users.push({
                    label: role,
                    value: role,
                    search: role?.toLowerCase() || '',
                    type: 'role',
                })
            }
        }
        // if (this.policyOwner && this.owner !== this.policyOwner) {
        //     this.users.push({
        //         label: 'Administrator',
        //         value: 'Administrator',
        //         search: 'administrator',
        //         type: 'user',
        //     })
        // }
        // if (this.documentOwner && this.owner !== this.documentOwner) {
        //     this.users.push({
        //         label: 'Owner',
        //         value: 'Owner',
        //         search: 'owner',
        //         type: 'user',
        //     })
        // }

        const users = this.data.getUsers();
        for (const user of users) {
            this.users.push({
                label: user.senderName,
                value: user.sender,
                role: user.senderRole,
                search: user.senderName?.toLowerCase() || '',
                type: 'user',
            })
        }
        for (const user of this.users) {
            this.userNames.set(user.value, `@${user.label}`);
        }
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

    private loadProfile() {
        if (!this.policyId || !this.documentId) {
            setTimeout(() => {
                this.loading = false;
            }, 500);
            this.data.setData([], 0);
            return;
        }

        this.loading = true;
        const filter = this.getFilters('load');
        forkJoin([
            this.profileService.getProfile(),
            this.policyEngineService.policy(this.policyId),
            this.policyEngineService
                .getPolicyComments(
                    this.policyId,
                    this.documentId,
                    filter
                )
        ])
            .pipe(takeUntil(this._destroy$))
            .subscribe(([profile, policy, response]) => {
                this.user = new UserPermissions(profile);
                this.owner = this.user.did;
                this.policy = policy;

                const { page, count } = this.policyEngineService.parsePage(response);
                this.parsMessages(page);
                this.data.setData(page, count);

                this.updateTargets();

                setTimeout(() => {
                    this.loading = false;
                }, 500);
            }, (e) => {
                this.loading = false;
            });
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
                const { page, count } = this.policyEngineService.parsePage(response);
                this.parsMessages(page);

                if (type === 'load') {
                    this.data.setData(page, count);
                } else if (type === 'more') {
                    this.data.after(page, count, target);
                } else if (type === 'update') {
                    this.data.before(page, count);
                }

                this.updateTargets();
                if (type === 'update') {
                    this.resetScroll();
                }

                setTimeout(() => {
                    this.loading = false;
                }, 500);
            }, (e) => {
                this.loading = false;
            });
    }

    private parsMessages(messages: any[]) {
        for (const item of messages) {
            item.__text = this.parsText(item, item?.document?.text);
        }
    }

    private parsText(message: any, text: string): any[] {
        const result: any[] = [];
        if (!text) {
            return result;
        }
        const tags = text.split(/(@[\[\{][a-zA-Z0-9_:.]+[\]\}])/g);
        for (const tag of tags) {
            if (tag) {
                if ((/(@[\[\{][a-zA-Z0-9_:.]+[\]\}])/g).test(tag)) {
                    const value = tag.substring(2, tag.length - 1);
                    const type = tag.startsWith('@[') ? 'role' : 'user';
                    if (message.recipients && message.recipients.includes(value)) {
                        result.push({
                            type: type,
                            text: tag,
                            tag: value
                        });
                    } else {
                        result.push({
                            type: 'text',
                            text: tag
                        })
                    }
                } else {
                    result.push({
                        type: 'text',
                        text: tag
                    })
                }
            }
        }
        return result
    }

    private findTags(text: string) {
        const recipients: Set<string> = new Set<string>();
        const tags = text.match(/@[\[\{][a-zA-Z0-9_:.]+[\]\}]/g);
        if (tags) {
            for (const tag of tags) {
                const value = tag.substring(2, tag.length - 1);
                const type = tag.startsWith('@[') ? 'role' : 'user';
                const recipient = this.users.find((user) => user.type === type && user.label === value);
                if (recipient) {
                    recipients.add(recipient.value);
                    text = text.replace(tag, type === 'role' ? `@[${recipient.value}]` : `@{${recipient.value}}`);
                }
            }
        }
        return {
            text: text,
            recipients: Array.from(recipients)
        };
    }

    public onSend() {
        if (!this.policyId || !this.documentId) {
            this.loading = false;
            return;
        }

        const { text, recipients } = this.findTags(this.textMessage);
        let anchor: string | undefined = undefined;
        if (this.field) {
            anchor = '';
        }
        const data = {
            anchor,
            recipients: recipients,
            text: text,
            files: this.files.map((f) => f.toJSON())
        };
        this.loading = true;
        this.policyEngineService
            .createPolicyComment(
                this.policyId,
                this.documentId,
                data
            ).subscribe((response) => {
                this.textMessage = '';
                this.files = [];
                this.loadComments('update');
            }, (e) => {
                this.loading = false;
            });
    }


    public onAttach($event: any) {
        $event.preventDefault();
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.txt, .pdf, .doc, .docx, .xls, .csv, .kml, .geoJSON, image/*';
        input.onchange = (event) => {
            const files: File[] = [];
            if (input.files) {
                for (let i = 0; i < input.files.length; i++) {
                    const file = input.files[i];
                    files.push(file);
                }
            }
            this.addFiles(files);
            input.remove();
        }
        input.click();
    }

    public onDrop($event: DragEvent) {
        $event.preventDefault();
        const files: File[] = [];
        if ($event.dataTransfer?.items) {
            for (let index = 0; index < $event.dataTransfer.items.length; index++) {
                const item = $event.dataTransfer.items[index];
                if (item.kind === "file") {
                    const file = item.getAsFile();
                    if (file) {
                        files.push(file);
                    }
                }
            }
        }
        this.addFiles(files);
    }

    private addFiles(files: File[]) {
        const results: AttachedFile[] = [];
        if (files?.length) {
            for (const file of files) {
                const result = new AttachedFile(file);
                results.push(result);
            }
        }
        for (const result of results) {
            result.upload(this.ipfs, this.policyId, false, this.onText.bind(this));
        }
        for (const result of results) {
            this.files.push(result);
        }
        this.updateDisabled();
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
        // debugger;
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

    public resetScroll() {
        try {
            this.messageContainer
                .nativeElement
                .querySelector('.messages')
                .scrollTo(0, 0)
        } catch (error) {
            return;
        }
    }

    public onMore() {
        const last = this.data.getLast();
        this.loadComments('more', last?.id);
    }

    public onLoadFile(file: any) {
        debugger;
    }

    // public getUserName(did: string) {
    //     return this.userNames.get(did) || did;
    // }

    public getUserName(t: any) {
        if (t.type === 'text') {
            return t.text;
        }
        if (t.type === 'tag') {
            return this.userNames.get(t.tag) || t.text;
        }
        if (t.type === 'role') {
            return this.userNames.get(t.tag) || t.text;
        }
        if (t.type === 'user') {
            return this.userNames.get(t.tag) || t.text;
        }
        return t.text;
    }

    public findChoices(searchText: string) {
        const search = searchText.toLowerCase();
        return this.users.filter((user) => {
            return user.search.includes(search);
        })
    }

    public getChoiceLabel(choice: any): string {
        if (choice.type === 'user') {
            return `@{${choice.label}} `;
        } else {
            return `@[${choice.value}] `;
        }
    }

    public onClose() {

    }
}