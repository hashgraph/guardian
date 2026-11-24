import { Component, EventEmitter, Input, Output, SimpleChanges, ViewChild } from '@angular/core';
import { forkJoin, Subject, takeUntil } from 'rxjs';
import moment from 'moment';
import { AttachedFile } from './attached-file';
import { DataList } from './data-list';
import { ProfileService } from 'src/app/services/profile.service';
import { Schema, SchemaField, UserPermissions } from '@guardian/interfaces';
import { CommentsService } from 'src/app/services/comments.service';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { getAvatarColor, getInitials } from './discussion-avatar';
import { DiscussionGroup, DiscussionItem, FieldItem, LastRead, ListItem, placeholderItems, TextItem, TextItemType } from './interfaces';

/**
 * Dialog for icon preview.
 */
@Component({
    selector: 'policy-comments',
    templateUrl: './policy-comments.component.html',
    styleUrls: ['./policy-comments.component.scss'],
    standalone: false
})
export class PolicyComments {
    @Input('document-id') documentId!: any | undefined;
    @Input('policy-id') policyId!: any | undefined;
    @Input('dry-run') dryRun!: any | undefined;
    @Input('field') field!: any | undefined;
    @Input('collapse') collapse: boolean = true;
    @Input('readonly') readonly: boolean = false;
    @Input('key') key: boolean = false;

    @ViewChild('messageContainer', { static: false }) messageContainer: any;
    @ViewChild('messageInput', { static: false }) messageInput: any;

    @Output('link') linkEvent = new EventEmitter<any>();
    @Output('collapse') collapseEvent = new EventEmitter<boolean>();
    @Output('view') viewEvent = new EventEmitter<any>();

    public loading: boolean = true;
    public user: UserPermissions = new UserPermissions();
    public owner: string;

    public textMessage: string;
    public files: AttachedFile[];
    public sendDisabled: boolean;

    public privacy: ListItem[] = [];
    public userNames = new Map<string, string>();
    public fieldNames = new Map<string, string>();
    /** Field path to the label the form shows for it. */
    public fieldLabels = new Map<string, string>();
    public users: ListItem[] = [];
    public schemas: Schema[] = [];

    public discussions: DiscussionItem[] = [];
    public lastRead: LastRead[] = [];

    public discussionGroups: DiscussionGroup[] = [];
    public currentDiscussion: DiscussionItem | null | undefined = null;
    public searchField?: FieldItem = undefined;
    public searchDiscussion: string = '';
    public searchMessage: string = '';

    public comments: DataList;

    public participantsOpen: boolean = false;
    public messageSearchOpen: boolean = false;
    /** True while the autocomplete menu is open: Enter then picks a suggestion instead of sending. */
    public menuOpen: boolean = false;

    public readonly counterFrom = 480;
    public readonly maxLength = 600;

    public triggerCharacter: string[] = ['@', '#'];
    public currentTab: 'new-discussion' | 'discussions' | 'messages' = 'discussions';
    public discussionForm = new FormGroup({
        name: new FormControl<string>('', Validators.required),
        relationships: new FormControl<string[]>([]),
        privacy: new FormControl<string>('', Validators.required),
        roles: new FormControl<string[]>([]),
        users: new FormControl<string[]>([]),

        parent: new FormControl<string>(''),
        field: new FormControl<string>(''),
        fieldName: new FormControl<string>(''),
    });
    public privacyList = [{
        label: 'Everyone',
        value: 'public',
        description: 'Anyone who can open this document can read and reply.',
    }, {
        label: 'Selected roles',
        value: 'roles',
        description: 'Only users with the policy roles you choose.',
    }, {
        label: 'Selected people',
        value: 'users',
        description: 'Only the people you choose. You are always included.',
    }];
    public rolesList: any[] = [];
    public usersList: any[] = [];
    public documentsList: any[] = [];
    public fieldList: any[] = [];

    public loadingItems = [
        ...placeholderItems,
        ...placeholderItems,
        ...placeholderItems,
        ...placeholderItems,
        ...placeholderItems,
    ];

    private _destroy$ = new Subject<void>();
    public _findChoices = this.findChoices.bind(this);
    public _getChoiceLabel = this.getChoiceLabel.bind(this);
    private interval: any;

    constructor(
        private profileService: ProfileService,
        private commentsService: CommentsService
    ) {
        this.comments = new DataList();
        this.loading = true;

        this.textMessage = '';
        this.files = [];
        this.sendDisabled = true;

        this.discussionForm.get('privacy')?.valueChanges.subscribe(val => {
            this.discussionForm.controls['roles'].clearValidators();
            this.discussionForm.controls['users'].clearValidators();
            if (val === 'roles') {
                this.discussionForm.controls['roles'].setValidators([Validators.required]);
            }
            if (val === 'users') {
                this.discussionForm.controls['users'].setValidators([Validators.required]);
            }
            this.discussionForm.controls['roles'].updateValueAndValidity();
            this.discussionForm.controls['users'].updateValueAndValidity();
        });

        this.interval = setInterval(() => {
            this.checkComments();
        }, 15000);
    }

    ngOnInit(): void {
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes.policyId || changes.documentId) {
            this.loading = true;
            this.loadProfile();
            this.updateTargets();
            this.changeView();
        } else {
            this.changeView();
        }
    }

    ngOnDestroy(): void {
        this._destroy$.next();
        this._destroy$.unsubscribe();
        clearInterval(this.interval);
        this.interval = null;
    }

    //#region API

    private loadProfile() {
        if (!this.policyId || !this.documentId) {
            setTimeout(() => {
                this.loading = false;
            }, 500);
            return;
        }

        this.loading = true;
        forkJoin([
            this.profileService.getProfile(),
            this.commentsService.getUsers(this.policyId, this.documentId),
            this.commentsService.getRelationships(this.policyId, this.documentId),
            this.commentsService.getSchemas(this.policyId, this.documentId),
            this.commentsService.getDiscussions(this.policyId, this.documentId, undefined, this.readonly)
        ])
            .pipe(takeUntil(this._destroy$))
            .subscribe(([
                profile,
                users,
                relationships,
                schemas,
                discussions
            ]) => {
                this.user = new UserPermissions(profile);
                this.owner = this.user.did;
                this.users = users;
                this.documentsList = relationships;
                this.discussions = discussions || [];
                this.schemas = schemas.map((s) => new Schema(s));

                this.updateTargets();

                this.loadDiscussionMetadata();
            }, (e) => {
                this.loading = false;
            });
    }

    private loadDiscussions() {
        this.loading = true;
        const filters = this.getDiscussionFilters();

        this.commentsService.getDiscussions(this.policyId, this.documentId, filters, this.readonly)
            .pipe(takeUntil(this._destroy$))
            .subscribe((discussions) => {
                this.discussions = discussions || [];
                this.loadDiscussionMetadata();
            }, (e) => {
                this.loading = false;
            });
    }

    private loadDiscussionMetadata() {
        this.loading = true;
        const ids = this.discussions.map((d) => d.id);
        this.commentsService.getLastReads(this.owner, ids)
            .pipe(takeUntil(this._destroy$))
            .subscribe((lastRead) => {
                this.lastRead = lastRead || [];

                this.updateDiscussions();

                setTimeout(() => {
                    this.loading = false;
                }, 1000);
            }, (e) => {
                this.lastRead = [];

                this.updateDiscussions();

                setTimeout(() => {
                    this.loading = false;
                }, 1000);
            });
    }

    private loadComments(
        type: 'load' | 'update' | 'more' | 'check',
        target?: string
    ) {
        if (!this.policyId || !this.currentDiscussion) {
            this.loading = false;
            this.comments.setData([], 0);
            return;
        }

        this.setCommentLoading(type, true);
        const filter = this.getCommentFilters(type, target);
        this.commentsService
            .getPolicyComments(
                this.policyId,
                this.currentDiscussion.targetId,
                this.currentDiscussion.id,
                filter,
                this.readonly
            )
            .pipe(takeUntil(this._destroy$))
            .subscribe((response) => {
                const { page, count } = this.commentsService.parsePage(response);
                this.parsMessages(page);
                this.setCommentData(type, page, count, target);
                this.markMessageRuns();
                this.refreshCommentScroll(type, page, count);
                this.updateLastRead();
                this.setCommentLoading(type, false);
            }, (e) => {
                this.setCommentLoading(type, false);
            });
    }

    public createNewDiscussion() {
        if (!this.policyId || !this.documentId) {
            this.loading = false;
            return;
        }
        this.discussionForm.value;
        this.loading = true;
        this.commentsService
            .createDiscussion(
                this.policyId,
                this.documentId,
                this.discussionForm.value
            ).subscribe((response) => {
                this.currentTab = 'messages';
                this.updateDiscussion(response);
                this.currentDiscussion = response;
                this.loadComments('load');
            }, (e) => {
                this.loading = false;
            });
    }

    public createComment() {
        if (!this.policyId || !this.currentDiscussion) {
            this.loading = false;
            return;
        }

        const { text, recipients, fields } = this.findTags(this.textMessage);
        const data = {
            recipients: recipients,
            fields: fields,
            text: text,
            files: this.files.map((f) => f.toJSON())
        };
        this.loading = true;
        this.sendDisabled = true;
        this.commentsService
            .createComment(
                this.policyId,
                this.currentDiscussion.targetId,
                this.currentDiscussion.id,
                data
            ).subscribe((response) => {
                this.textMessage = '';
                this.files = [];
                this.sendDisabled = true;
                this.resetComposerHeight();
                const first = this.comments.getFirst();
                this.loadComments('update', first?.id);
            }, (e) => {
                this.loading = false;
                this.updateDisabled();
            });
    }

    public onLoadFile(file: AttachedFile) {
        file
            .download(this.commentsService)
            .pipe(takeUntil(this._destroy$))
            .subscribe((response: ArrayBuffer) => {
                const blob = new Blob([response], { type: file.type });
                const url = window.URL.createObjectURL(blob);
                const downloadLink = document.createElement('a');
                downloadLink.href = url;
                downloadLink.setAttribute('download', file.name);
                document.body.appendChild(downloadLink);
                downloadLink.click();
                downloadLink.remove();
                window.URL.revokeObjectURL(url);
                file.loading = false;
            }, (e) => {
                file.loading = false;
            });
    }
    //#endregion

    //#region Filters

    private setCommentLoading(
        type: 'load' | 'update' | 'more' | 'check',
        loading: boolean
    ) {
        if (loading) {
            if (type !== 'check') {
                this.loading = true;
            }
        } else {
            if (type !== 'check') {
                setTimeout(() => {
                    this.loading = false;
                }, 1000);
            }
        }
    }

    private getCommentFilters(
        type: 'load' | 'update' | 'more' | 'check',
        target?: string
    ): any {
        const filters: any = {
            search: this.searchMessage
        };
        if (type === 'load') {
            return filters;
        } else if (type === 'more') {
            filters.lt = target;
            return filters;
        } else if (type === 'update') {
            filters.gt = target;
            return filters;
        } else if (type === 'check') {
            filters.gt = target;
            return filters;
        }
    }

    private setCommentData(
        type: 'load' | 'update' | 'more' | 'check',
        page: any[],
        count: number,
        target?: string
    ) {
        if (type === 'load') {
            this.comments.setData(page, count);
        } else if (type === 'more') {
            this.comments.after(page, count, target);
        } else if (type === 'update') {
            this.comments.before(page, count);
        } else if (type === 'check') {
            this.comments.before(page, count);
        }
    }

    private refreshCommentScroll(
        type: 'load' | 'update' | 'more' | 'check',
        page: any[],
        count: number
    ) {
        if (page?.length) {
            if (type === 'update') {
                this.resetScroll();
            } else if (type === 'check') {
                this.resetScroll();
            }
        }
    }

    private getDiscussionFilters() {
        return {
            search: this.searchDiscussion,
            field: this.searchField?.field
        }
    }

    private updateLastRead() {
        this.commentsService.setLastRead(
            this.owner,
            this.policyId,
            this.documentId,
            this.currentDiscussion?.id,
            this.comments.count
        ).subscribe((response) => { }, (e) => { });
    }

    private checkComments() {
        if (this.currentTab !== 'messages' || !this.currentDiscussion) {
            return;
        }
        const first = this.comments.getFirst();
        this.loadComments('check', first?.id);
    }

    //#endregion

    //#region Parse Data

    private updateTargets() {
        this.userNames.clear();
        for (const user of this.users) {
            user.label = user.label
                ?.replace(/\[\{/g, '(')
                ?.replace(/\]\}/g, ')');
            user.search = user.label?.toLowerCase() || '';
        }
        for (const user of this.users) {
            this.userNames.set(user.value, `@${user.label}`);
        }
        this.rolesList = [];
        this.usersList = [];
        for (const item of this.users) {
            if (item.type === 'role') {
                this.rolesList.push(item);
            }
            if (item.type === 'user') {
                this.usersList.push(item);
            }
        }

        this.fieldNames.clear();
        this.fieldLabels.clear();
        const fieldMap = new Map<string | undefined, string>();
        for (const schema of this.schemas) {
            this.updateFields(schema.fields, fieldMap, '');
        }
        this.fieldList = [];
        for (const [value, label] of fieldMap.entries()) {
            const _label = label
                ?.replace(/\[\{/g, '(')
                ?.replace(/\]\}/g, ')') || '';
            this.fieldList.push({
                type: 'field',
                search: _label.toLocaleLowerCase(),
                label: _label,
                value
            });
            this.fieldNames.set(value || '', `#${label}`);
        }
    }

    private updateFields(
        fields: SchemaField[] | undefined,
        map: Map<string | undefined, string>,
        parent: string
    ) {
        if (Array.isArray(fields)) {
            for (const field of fields) {
                map.set(field.fullPath, `${parent}${field.description}`);
                if (field.fullPath) {
                    this.fieldLabels.set(field.fullPath, field.description || field.title || field.name);
                }
                this.updateFields(field.fields, map, `${parent}${field.description}/`);
            }
        }
    }

    private updateDiscussions() {
        for (const discussion of this.discussions) {
            this.updateDiscussion(discussion);
        }

        const lastMap = new Map<string, number>();
        for (const item of this.lastRead) {
            lastMap.set(item.discussionId, item.count);
        }

        const currentGroup: DiscussionGroup = { name: 'Current', items: [], collapsed: false };
        const relatedGroup: DiscussionGroup = { name: 'Related documents', items: [], collapsed: false };
        const historyGroup: DiscussionGroup = { name: 'Previous version', items: [], collapsed: false };
        for (const discussion of this.discussions) {
            if (discussion.targetId === this.documentId) {
                currentGroup.items.push(discussion);
                discussion._hidden = currentGroup.collapsed;
            } else if (
                Array.isArray(discussion.historyIds) &&
                discussion.historyIds.includes(this.documentId)
            ) {
                historyGroup.items.push(discussion);
                discussion._hidden = historyGroup.collapsed;
            } else {
                relatedGroup.items.push(discussion);
                discussion._hidden = relatedGroup.collapsed;
            }
            discussion._count = lastMap.get(discussion.id) || 0;
            discussion._unread = Math.max(discussion.count - discussion._count, 0);
        }
        if (this.discussions.length) {
            this.discussionGroups = [currentGroup];
        }
        if (relatedGroup.items.length) {
            this.discussionGroups.push(relatedGroup);
        }
        if (historyGroup.items.length) {
            this.discussionGroups.push(historyGroup);
        }
    }

    private updateDiscussion(discussion?: DiscussionItem) {
        if (!discussion) {
            return;
        }
        discussion._count = 0;
        discussion._unread = discussion.count;
        discussion._short = (discussion.name || '#').substring(0, 1);
        discussion._initials = getInitials(discussion.name);
        discussion._color = getAvatarColor(discussion.name);
        discussion._private = discussion.privacy === 'users' || discussion.privacy === 'roles';
        discussion._icon = discussion._private ? 'chat-2' : 'chat-1';
        if (discussion.field) {
            discussion._fieldLabel = this.getFieldLabel(discussion.field, discussion.fieldName);
            discussion._fieldKey = this.getFieldKey(discussion.field);
        } else {
            discussion._fieldLabel = '';
            discussion._fieldKey = '';
        }
        discussion._users = [];
        const map = new Map<string, any>();
        if (discussion.privacy === 'users' || discussion.privacy === 'roles') {
            if (discussion.roles) {
                for (const role of discussion.roles) {
                    map.set(role, {
                        icon: 'group',
                        label: role,
                        type: 'role'
                    })
                }
            }
            if (discussion.users) {
                for (const user of discussion.users) {
                    map.set(user, {
                        did: user,
                        icon: 'user-2',
                        label: this.getUserName(user),
                        type: 'user'
                    })
                }
            }
        }
        if (discussion.owner) {
            // The creator is listed for public discussions too ("Started by")
            map.set(discussion.owner, {
                did: discussion.owner,
                icon: 'user-2',
                label: this.getUserName(discussion.owner),
                type: 'user'
            })
        }
        for (const item of map.values()) {
            if (item.type === 'user') {
                item.owner = item.did === discussion.owner;
                item.me = !!this.owner && item.did === this.owner;
            }
            item._color = getAvatarColor(item.label || '');
            discussion._users.push(item);
        }
    }

    /** "Everyone", "N roles" or "N participants". */
    public getParticipantsSummary(discussion?: DiscussionItem | null): string {
        if (!discussion || discussion.privacy === 'public' || !discussion.privacy) {
            return 'Everyone';
        }
        if (discussion.privacy === 'roles') {
            const count = discussion._users?.filter((u) => u.type === 'role').length || 0;
            return count === 1 ? '1 role' : `${count} roles`;
        }
        const count = discussion._users?.filter((u) => u.type === 'user').length || 0;
        return count === 1 ? '1 participant' : `${count} participants`;
    }

    /** The label of the field in the form, then the name stored with the discussion, then the key. */
    public getFieldLabel(field?: string | null, fallback?: string | null): string {
        return (field && this.fieldLabels.get(field)) || fallback || this.getFieldKey(field);
    }

    /** The last segment of the field path. A stored path is `<schema iri>/<name>[.<name>…]`. */
    public getFieldKey(field?: string | null): string {
        const path = field || '';
        return path.substring(path.indexOf('/') + 1).split('.').pop() || '';
    }

    public get discussionsTotal(): number {
        return this.discussionGroups.reduce((total, group) => total + group.items.length, 0);
    }

    public get participantsRoles() {
        return this.currentDiscussion?._users?.filter((u) => u.type === 'role') || [];
    }

    public get participantsPeople() {
        return this.currentDiscussion?._users?.filter((u) => u.type === 'user') || [];
    }

    public get counterVisible(): boolean {
        return this.textMessage.length >= this.counterFrom;
    }

    public get counterLimit(): boolean {
        return this.textMessage.length >= this.maxLength;
    }

    private parsText(message: any, text: string): TextItem[] {
        const result: TextItem[] = [];
        if (!text) {
            return result;
        }

        const separatorMap = new Map<string, TextItemType>();
        if (Array.isArray(message.fields)) {
            for (const field of message.fields) {
                separatorMap.set(`#[${field}]`, 'field');
            }
        }
        if (Array.isArray(message.recipients)) {
            for (const user of message.recipients) {
                separatorMap.set(`@[${user}]`, 'role');
                separatorMap.set(`@{${user}}`, 'user');
            }
        }
        separatorMap.set(`@[all]`, 'all');
        separatorMap.set(`@[All]`, 'all');
        const separators: string[] = Array.from(separatorMap.keys()).map((s: string) => {
            return s.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
        });
        const reg = `(${separators.join('|')})`;
        const regExp = new RegExp(reg);
        const tags = text.trim().split(regExp);

        for (const tag of tags) {
            if (tag) {
                const type = separatorMap.get(tag);
                if (type) {
                    const value = tag.substring(2, tag.length - 1);
                    result.push({
                        type: type,
                        text: tag,
                        tag: value
                    });
                } else {
                    result.push({
                        type: 'text',
                        text: tag,
                        tag: ''
                    })
                }
            }
        }

        return result;
    }

    public getTagName(t: TextItem) {
        if (t.type === 'all') {
            return '@All';
        }
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
        if (t.type === 'field') {
            return this.fieldNames.get(t.tag) || t.text;
        }
        return t.text;
    }

    public getTooltip(t: TextItem): {
        type: string;
        name: string;
        value?: string;
    } | null {
        if (t.type === 'role') {
            return {
                type: 'Role',
                name: t.label || ''
            };
        }
        if (t.type === 'user') {
            return {
                type: 'User',
                name: t.label || '',
                value: t.tag
            };
        }
        if (t.type === 'field') {
            return {
                type: 'Field',
                name: t.label || ''
            };
        }
        return null;
    }

    private getDocument(item: any) {
        if (item?.document?.credentialSubject) {
            if (Array.isArray(item.document.credentialSubject)) {
                return item.document.credentialSubject[0];
            } else if (item.document.credentialSubject) {
                return item?.document.credentialSubject;
            }
        }
        return null;
    }

    private parsMessages(messages: any[]) {
        for (const item of messages) {
            const document = this.getDocument(item);
            const text = document?.text;
            const files: any[] = document?.files || [];

            const textItems = this.parsText(item, text);
            for (const textItem of textItems) {
                textItem.label = this.getTagName(textItem);
                textItem.tooltip = this.getTooltip(textItem);
            }
            item.__text = textItems;
            item.__files = files.map((f) => AttachedFile.fromLink(item.policyId, item.targetId, item.discussionId, f));
            item.__initial = getInitials(item.senderName || '').substring(0, 1);
            item.__color = getAvatarColor(item.senderName || '');
        }
    }

    /**
     * Marks the day boundaries and the runs of one sender over every loaded message.
     * The list is newest first, so the visually previous message is the next one.
     */
    private markMessageRuns() {
        const data = this.comments.data;
        for (let i = 0; i < data.length; i++) {
            const item = data[i];
            const older = data[i + 1];
            const day = moment(item.timestamp);
            const sameDay = !!older && day.isSame(moment(older.timestamp), 'day');
            item.__day = sameDay ? '' : this.getDayLabel(item.timestamp);
            item.__cont = sameDay && older.sender === item.sender;
        }
    }

    public getDayLabel(date: string): string {
        const day = moment(date);
        if (!day.isValid()) {
            return '';
        }
        if (day.isSame(moment(), 'day')) {
            return 'Today';
        }
        if (day.isSame(moment().subtract(1, 'day'), 'day')) {
            return 'Yesterday';
        }
        return day.format('MMM DD');
    }

    public getTime(date: string): string {
        const day = moment(date);
        return day.isValid() ? day.format('HH:mm') : '';
    }

    private parsTags(key: '@' | '#', text: string) {
        const results: {
            key: string;
            type: '[' | '{';
            tag: string;
            value: string;
        }[] = [];
        if (key === '@') {
            const items = text.match(/@[\[\{][^\[\{\}\]]+[\]\}]/g)
            if (items) {
                for (const tag of items) {
                    const value = tag.substring(2, tag.length - 1);
                    const type = tag.startsWith('@[') ? '[' : '{';
                    results.push({ key, type, tag, value });
                }
            }
        }
        if (key === '#') {
            const items = text.match(/#[\[\{][^\[\{\}\]]+[\]\}]/g)
            if (items) {
                for (const tag of items) {
                    const value = tag.substring(2, tag.length - 1);
                    const type = tag.startsWith('#[') ? '[' : '{';
                    results.push({ key, type, tag, value });
                }
            }
        }
        return results;
    }

    private findTags(text: string) {
        const recipients: Set<string> = new Set<string>();
        const recipientTags = this.parsTags('@', text);
        for (const recipientTag of recipientTags) {
            const type = recipientTag.type === '[' ? 'role' : 'user';
            const recipient = this.users.find((e) => e.type === type && e.label === recipientTag.value);
            if (recipient) {
                recipients.add(recipient.value);
                text = text.replace(recipientTag.tag, type === 'role' ? `@[${recipient.value}]` : `@{${recipient.value}}`);
            }
        }

        const fields: Set<string> = new Set<string>();
        const fieldTags = this.parsTags('#', text);
        for (const fieldTag of fieldTags) {
            const field = this.fieldList.find((e) => e.label === fieldTag.value);
            if (field) {
                fields.add(field.value);
                text = text.replace(fieldTag.tag, `#[${field.value}]`);
            }
        }

        return {
            text: text,
            recipients: Array.from(recipients),
            fields: Array.from(fields),
        };
    }

    //#endregion

    //#region Other

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
        if (!this.policyId || !this.currentDiscussion) {
            return;
        }
        const results: AttachedFile[] = [];
        if (files?.length) {
            for (const file of files) {
                if (this.files.length + results.length < 20) {
                    const result = AttachedFile.fromFile(
                        this.policyId,
                        this.currentDiscussion.targetId,
                        this.currentDiscussion.id,
                        file
                    );
                    results.push(result);
                }
            }
        }
        for (const result of results) {
            result
                .upload(this.commentsService)
                .pipe(takeUntil(this._destroy$))
                .subscribe((cid: string) => {
                    this.onText(null);
                }, (e) => {
                    this.onText(null);
                });
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

    public onText($event: any) {
        if ($event?.target) {
            try {
                $event.target.style.height = "20px";
                $event.target.style.height = Math.min($event.target.scrollHeight, 140) + "px";
            } catch (error) {
                console.error(error);
            }
        }
        setTimeout(() => {
            this.updateDisabled();
        });
    }

    /** Enter sends, Shift+Enter adds a line; while the autocomplete menu is open Enter picks a suggestion. */
    public onMessageKeydown(event: KeyboardEvent) {
        if (event.key !== 'Enter' || event.shiftKey || event.isComposing || this.menuOpen) {
            return;
        }
        event.preventDefault();
        if (!this.sendDisabled) {
            this.createComment();
        }
    }

    private resetComposerHeight() {
        try {
            this.messageInput.nativeElement.style.height = '';
        } catch (error) {
            return;
        }
    }

    public toggleParticipants() {
        this.participantsOpen = !this.participantsOpen;
    }

    public toggleMessageSearch() {
        this.messageSearchOpen = !this.messageSearchOpen;
        if (!this.messageSearchOpen && this.searchMessage) {
            this.searchMessage = '';
            this.onSetMessageSearch();
        }
    }

    private resetThreadView() {
        this.participantsOpen = false;
        this.messageSearchOpen = false;
        this.menuOpen = false;
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
            if (this.messageContainer) {
                this.messageContainer
                    .nativeElement
                    .querySelector('.messages')
                    .scrollTo(0, 0)
            }
        } catch (error) {
            return;
        }
    }

    public onMore() {
        const last = this.comments.getLast();
        this.loadComments('more', last?.id);
    }

    public getUserName(did: string) {
        for (const user of this.users) {
            if (user.value === did) {
                return user.label;
            }
        }
        return did;
    }

    public findChoices(searchText: string, trigger: string) {
        const search = searchText.toLowerCase();
        if (trigger === '@') {
            return this.users.filter((user) => {
                return user.search?.includes(search);
            }).slice(0, 10)
        } else {
            return this.fieldList.filter((field) => {
                return field.search?.includes(search);
            }).slice(0, 10)
        }
    }

    public getChoiceLabel(choice: any): string {
        if (choice.type === 'user') {
            return `@{${choice.label}} `;
        } else if (choice.type === 'role') {
            return `@[${choice.label}] `;
        } else if (choice.type === 'all') {
            return `@[${choice.label}] `;
        } else if (choice.type === 'field') {
            return `#[${choice.label}] `;
        } else {
            return `@[${choice.value}] `;
        }
    }

    public onClose() {
        this.resetThreadView();
        this.textMessage = '';
        this.files = [];
        this.sendDisabled = true;
        this.currentDiscussion = null;
        this.collapse = true;
        this.currentTab = 'discussions';
        this.collapseEvent.emit(true);
        this.changeView();
    }

    public onOpen(discussion?: DiscussionItem) {
        this.resetThreadView();
        this.currentDiscussion = discussion;
        this.collapse = false;
        this.currentTab = discussion ? 'messages' : 'discussions';
        this.collapseEvent.emit(false);
        this.changeView();
        if (this.currentTab === 'messages') {
            this.loadComments('load');
        } else {
            this.loadDiscussions();
        }
    }

    public onOpenGroup(group: DiscussionGroup) {
        group.collapsed = !group.collapsed;
        for (const item of group.items) {
            item._hidden = group.collapsed;
        }
    }

    public selectDiscussion(discussion?: DiscussionItem) {
        this.resetThreadView();
        this.textMessage = '';
        this.files = [];
        this.sendDisabled = true;
        this.currentDiscussion = discussion;
        this.currentTab = discussion ? 'messages' : 'discussions';
        this.changeView();
        if (this.currentTab === 'messages') {
            this.loadComments('load');
        } else {
            this.loadDiscussions();
        }
    }

    public onNewDiscussion() {
        this.onOpen();
        this.currentTab = 'new-discussion';
        this.discussionForm.setValue({
            name: '',
            relationships: [],
            privacy: 'public',
            roles: [],
            users: [],
            parent: this.currentDiscussion?.id || null,
            field: this.searchField?.field || null,
            fieldName: this.searchField?.name || null,
        })
    }

    public onPrivacy(value: string) {
        this.discussionForm.controls['privacy'].setValue(value);
    }

    public onDeleteFormField() {
        const value: any = this.discussionForm.value;
        value.field = '';
        value.fieldName = '';
        this.discussionForm.setValue(value);
    }

    public cancelNewDiscussion() {
        this.currentTab = 'discussions';
    }


    public setLink(currentField?: any) {
        try {
            const field = this.fieldList.find((f) => f.value === currentField.field);
            const name = field ? field.label : currentField.name;
            this.textMessage = (this.textMessage || '') + ` #[${name}]`;
            if (this.messageInput) {
                this.messageInput
                    .nativeElement
                    .focus()
            }
        } catch (error) {
            return;
        }
    }

    public onDiscussionAction($event: any) {
        if ($event?.type === 'open') {
            this.searchField = {
                field: $event.field,
                name: $event.fieldName,
            };
            this.currentDiscussion = null;
            this.collapse = false;

            if (this.currentTab === 'new-discussion') {
                this.collapseEvent.emit(false);
                this.changeView();
                const value: any = this.discussionForm.value;
                value.field = this.searchField.field;
                value.fieldName = this.searchField.name;
                this.discussionForm.setValue(value);
            } else {
                this.currentTab = 'discussions';
                this.collapseEvent.emit(false);
                this.changeView();
                this.loadDiscussions();
            }
        }
        if ($event?.type === 'link') {
            const currentField = {
                field: $event.field,
                name: $event.fieldName,
            };
            if (this.collapse || !this.currentDiscussion) {
                this.currentDiscussion = null;
                this.collapse = false;
                this.currentTab = 'discussions';
                this.collapseEvent.emit(false);
                this.changeView();
                this.loadDiscussions();
            }
            this.setLink(currentField);
        }
    }

    private changeView() {
        if (this.collapse) {
            this.viewEvent.emit({
                type: 'collapsed'
            });
        } else if (this.currentDiscussion) {
            this.viewEvent.emit({
                type: 'messages',
                discussion: this.currentDiscussion
            });
        } else {
            this.viewEvent.emit({
                type: 'discussions'
            });
        }
    }

    public onSetSearch() {
        this.loadDiscussions();
    }

    public onDeleteSearch() {
        this.searchField = undefined;
        this.loadDiscussions();
    }

    public onSetMessageSearch() {
        this.loadComments('load');
    }

    public onLinkField(field?: string) {
        this.linkEvent.emit(field);
    }

    public onLinkText(item: TextItem) {
        if (item.type === 'field') {
            this.linkEvent.emit(item.tag);
        }
    }

    public onKey(discussion?: any) {
        this.loading = true;
        this.commentsService
            .downloadKey(
                this.policyId,
                this.documentId,
                discussion?.id,
            )
            .pipe(takeUntil(this._destroy$))
            .subscribe((response: ArrayBuffer) => {
                const blob = new Blob([response], { type: "text/plain;charset=utf-8" });
                const url = window.URL.createObjectURL(blob);
                const downloadLink = document.createElement('a');
                downloadLink.href = url;
                downloadLink.setAttribute('download', `${discussion?.name || this.documentId}.key`);
                document.body.appendChild(downloadLink);
                downloadLink.click();
                downloadLink.remove();
                window.URL.revokeObjectURL(url);
                this.loading = false;
            }, (e) => {
                this.loading = false;
            });
    }
    //#endregion

    public onCollapse() {
        if (this.collapse) {
            this.onOpen();
        } else {
            this.onClose();
        }
    }
}