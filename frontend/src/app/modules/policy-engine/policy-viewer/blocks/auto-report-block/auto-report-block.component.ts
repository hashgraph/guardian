import { Component, ElementRef, HostListener, Input, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';
import * as moment from 'moment';
import { VCViewerDialog } from 'src/app/modules/schema-engine/vc-dialog/vc-dialog.component';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { PolicyHelper } from 'src/app/services/policy-helper.service';
import { WebSocketService } from 'src/app/services/web-socket.service';

enum DashboardType {
    Advanced = 'Advanced',
    Simplified = 'Simplified'
}

/**
 * Component for display block of 'ReportBlock' types.
 */
@Component({
    selector: 'app-auto-report-block',
    templateUrl: './auto-report-block.component.html',
    styleUrls: ['./auto-report-block.component.css']
})
export class AutoReportBlockComponent implements OnInit {
    @Input('id') id!: string;
    @Input('policyId') policyId!: string;
    @Input('static') static!: any;

    public isActive = false;
    public loading: boolean = true;
    public socket: any;
    public content: string | null = null;
    public report!: any;
    public target!: any;

    public dashboardType = DashboardType.Advanced;
    public status!: string;
    public schemas!: any[];
    public tokens!: any[];
    public roles!: any[];

    public selected: any;

    private _topics1!: any[];
    private _topics2!: any[];
    public get topics(): any[] {
        if (this.dashboardType === DashboardType.Advanced) {
            return this._topics1;
        } else {
            return this._topics2;
        }
    }

    private _messages1!: any[];
    private _messages2!: any[];
    public get messages(): any[] {
        if (this.dashboardType === DashboardType.Advanced) {
            return this._messages1;
        } else {
            return this._messages2;
        }
    }

    private _gridTemplateRows1!: string;
    private _gridTemplateRows2!: string;
    public get gridTemplateRows(): string {
        if (this.dashboardType === DashboardType.Advanced) {
            return this._gridTemplateRows1;
        } else {
            return this._gridTemplateRows2;
        }
    }

    private _gridTemplateColumns1!: string;
    private _gridTemplateColumns2!: string;
    public get gridTemplateColumns(): string {
        if (this.dashboardType === DashboardType.Advanced) {
            return this._gridTemplateColumns1;
        } else {
            return this._gridTemplateColumns2;
        }
    }

    public searchForm = this.fb.group({
        value: ['', Validators.required],
    });

    constructor(
        private element: ElementRef,
        private fb: FormBuilder,
        private policyEngineService: PolicyEngineService,
        private wsService: WebSocketService,
        private policyHelper: PolicyHelper,
        private dialog: MatDialog,
        private iconRegistry: MatIconRegistry,
        private sanitizer: DomSanitizer
    ) {
        iconRegistry.addSvgIconLiteral('token', sanitizer.bypassSecurityTrustHtml(`
            <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
                <path id="Icon_awesome-coins" data-name="Icon awesome-coins" d="M0,28.5v3C0,33.982,6.047,36,13.5,36S27,33.982,27,31.5v-3c-2.9,2.046-8.212,3-13.5,3S2.9,30.544,0,28.5ZM22.5,9C29.953,9,36,6.982,36,4.5S29.953,0,22.5,0,9,2.018,9,4.5,15.047,9,22.5,9ZM0,21.122V24.75c0,2.482,6.047,4.5,13.5,4.5S27,27.232,27,24.75V21.122c-2.9,2.391-8.22,3.628-13.5,3.628S2.9,23.513,0,21.122Zm29.25.773C33.279,21.115,36,19.666,36,18V15a17.267,17.267,0,0,1-6.75,2.426ZM13.5,11.25C6.047,11.25,0,13.767,0,16.875S6.047,22.5,13.5,22.5,27,19.983,27,16.875,20.953,11.25,13.5,11.25Zm15.42,3.959c4.219-.759,7.08-2.25,7.08-3.959v-3c-2.5,1.765-6.785,2.714-11.3,2.939A7.874,7.874,0,0,1,28.92,15.209Z"/>
            </svg>
        `));
    }

    public ngOnInit(): void {
        if (!this.static) {
            this.socket = this.wsService.blockSubscribe(this.onUpdate.bind(this));
        }
        this.loadData();
    }

    public ngOnDestroy(): void {
        if (this.socket) {
            this.socket.unsubscribe();
        }
    }

    public onUpdate(blocks: string[]): void {
        if (Array.isArray(blocks) && blocks.includes(this.id)) {
            this.loadData();
        }
    }

    private loadData() {
        this.loading = true;
        if (this.static) {
            this.setData(this.static);
            setTimeout(() => {
                this.loading = false;
            }, 500);
        } else {
            this.loading = true;
            this.policyEngineService.getBlockData(
                this.id,
                this.policyId
            ).subscribe((data: any) => {
                this.setData(data);
                this.loading = false;
            }, (e) => {
                console.error(e.error);
                this.loading = false;
            });
        }
    }

    private setData(data: any) {
        this.report = null;

        this._topics1 = [];
        this._topics2 = [];

        this._messages1 = [];
        this._messages2 = [];

        this.schemas = [];
        this.tokens = [];
        this.roles = [];

        this._gridTemplateRows1 = '';
        this._gridTemplateRows2 = '';
        this._gridTemplateColumns1 = '';
        this._gridTemplateColumns2 = '';

        if (data) {
            this.status = data.status;
            this.report = data.report;
            this.target = data.target;
            if (this.report) {
                this.createReport(this.report);
                this.createSmallReport();
            }
        }
        setTimeout(() => {
            this.render(this.messages);
        }, 100);
    }

    private createSmallReport() {
        for (const topic of this._topics1) {
            if (topic.message?.messageType === 'INSTANCE_POLICY_TOPIC') {
                const t = { ...topic };
                t.__parent = null;
                t.__offset = 20;
                t.__order = this._topics2.length + 1;
                t.messages = this.getAllMessages(topic, []);
                this._topics2.push(t);
            }
        }
        for (const topic of this._topics2) {
            for (const message of topic.messages) {
                this._messages2.push(message);
            }
        }
        let gridSize = 0;
        this._messages2.sort((a, b) => a.__order > b.__order ? 1 : -1);
        for (let index = 0; index < this._messages2.length; index++) {
            const message = this._messages2[index];
            message.__order = index + 1;
            gridSize = Math.max(gridSize, message.__order);
        }
        this._gridTemplateColumns2 = 'repeat(' + gridSize + ', 230px)';
        this._gridTemplateRows2 = 'repeat(' + this._topics2.length + ', 100px) 30px';
    }

    private getAllMessages(topic: any, messages: any[]): any[] {
        if (topic.messages) {
            for (const message of topic.messages) {
                messages.push({ ...message });
            }
        }
        if (topic.children) {
            for (const child of topic.children) {
                this.getAllMessages(child, messages);
            }
        }
        return messages;
    }

    private createReport(report: any) {
        this.schemas = report.schemas || [];
        this.tokens = report.tokens || [];
        this.roles = report.roles || [];
        this.parseTopics(report.topics, null, 1);
        this.parseMessages();
        this.parseRoles();
    }

    private parseTopics(topics: any[], parent: any, offset: number) {
        for (const topic of topics) {
            if (topic.message && topic.message.messageType === 'INSTANCE_POLICY_TOPIC') {
                topic.__policy = topic.topicId;
            } else if (parent) {
                topic.__policy = parent.__policy;
            }
            topic.__parent = parent;
            topic.__offset = 15 * offset;
            topic.__order = this._topics1.length + 1;
            this._topics1.push(topic);
            if (topic.children) {
                this.parseTopics(topic.children, topic, offset + 1);
            }
        }
    }

    private parseMessages() {
        let gridSize = 0;
        for (const topic of this._topics1) {
            for (const message of topic.messages) {
                message.__policy = topic.__policy;
                message.__order = message.order + 1;
                message.__status = this.getStatusLabel(message);
                message.__timestamp = this.getMessageTimestamp(message);
                if (message.type === 'VP-Document') {
                    message.__issuer = this.getIssuer(message);
                    message.__documents = this.getVPDocuments(message);
                }
                if (message.type === 'VC-Document') {
                    message.__schema = this.searchSchema(message);
                    message.__issuer = this.getIssuer(message);
                }
                if (message.type === 'Role-Document') {
                    message.__schema = this.searchSchema(message);
                    message.__issuer = this.getIssuer(message);
                }
                if (message.__schema) {
                    message.__schemaName = message.__schema.name;
                    message.__schemaDocument = message.__schema.document;
                    message.__schemaLabel = this.getSchemaLabel(message.__schema);
                }
                if (message.__documents) {
                    for (const item of message.__documents) {
                        if (this.ifMint(item)) {
                            message.__amount = item.document.credentialSubject[0].amount;
                            message.__tokenId = item.document.credentialSubject[0].tokenId;
                            message.__token = this.searchToken(message);
                        }
                    }
                }
                if (this.ifMint(message)) {
                    message.__amount = message.document.credentialSubject[0].amount;
                    message.__tokenId = message.document.credentialSubject[0].tokenId;
                    message.__token = this.searchToken(message);
                }
                if (message.__token) {
                    message.__tokenName = message.__token.name;
                }
                message.__ifTopicMessage = this.ifTopicMessage(message);
                message.__ifPolicyMessage = this.ifPolicyMessage(message);
                message.__ifInstanceMessage = this.ifInstanceMessage(message);
                message.__ifDIDMessage = this.ifDIDMessage(message);
                message.__ifVCMessage = this.ifVCMessage(message);
                message.__ifMintMessage = this.ifMintMessage(message);
                message.__ifVPMessage = this.ifVPMessage(message);
                message.__ifRoleMessage = this.ifRoleMessage(message);
                gridSize = Math.max(gridSize, message.__order);
                this._messages1.push(message);
            }
            if (topic.__parent) {
                topic.__start = 100 * topic.__parent.__order;
                topic.__end = 100 * topic.__order;
                topic.__height = topic.__end - topic.__start - 50;
            }
        }
        for (const message of this._messages1) {
            if (message.relationships) {
                message.__relationships = [];
                for (const relationship of message.relationships) {
                    message.__relationships.push(this.createRelationship(relationship));
                }
            }
        }
        for (const topic of this._topics1) {
            if (topic.message && topic.message.rationale) {
                topic.__rationale = this.getRelationship(this._messages1, topic.message.rationale);
                topic.message.__rationale = topic.__rationale;
            }
        }
        this._gridTemplateColumns1 = 'repeat(' + gridSize + ', 230px)';
        this._gridTemplateRows1 = 'repeat(' + this._topics1.length + ', 100px) 30px';
    }

    private parseRoles() {
        const roles = new Map<string, any>();
        for (const message of this._messages1) {
            if (message.__ifRoleMessage) {
                roles.set(message.id, {
                    group: message.group,
                    role: message.role,
                    did: message.issuer,
                    payer: message.payer,
                    topicId: message.__policy,
                });
            }
        }
        for (const topic of this._topics1) {
            if (topic.message && topic.message.messageType === 'INSTANCE_POLICY_TOPIC') {
                roles.set(`${topic.topicId}:${topic.message.owner}`, {
                    group: null,
                    role: 'Standard Registry',
                    did: topic.message.owner,
                    payer: topic.message.payer,
                    topicId: topic.topicId
                });
            }
        }
        for (const message of this._messages1) {
            if (message.relationships) {
                for (const relationship of message.relationships) {
                    if (roles.has(relationship)) {
                        message.__user = roles.get(relationship);
                    }
                }
            }
            if (!message.__user) {
                message.__user = roles.get(`${message.__policy}:${message.__issuer}`);
            }
            if (!message.__user) {
                message.__user = {
                    group: null,
                    role: null,
                    did: message.__issuer,
                    payer: message.payer,
                    topicId: message.topicId
                }
            }
            message.__userName = message.__user.role || message.__user.group || message.__user.did;
        }
    }

    private createRelationship(messageId: string) {
        const message = this._messages1.find((role: any) => role.id === messageId);
        if (message) {
            if (message.__ifRoleMessage) {
                return {
                    id: messageId,
                    visible: false,
                    name: 'Roles & Groups'
                }
            } else {
                return {
                    id: messageId,
                    visible: true,
                    name: message.__schemaLabel || 'Document'
                }
            }
        } else {
            return {
                id: messageId,
                visible: false,
                name: 'Document'
            }
        }
    }

    private getSchemaLabel(schema: any): string {
        switch (schema.name) {
            case 'MintToken': {
                return 'Mint Token';
            }
            case 'UserRole': {
                return 'Role';
            }
            default: {
                return schema.name;
            }
        }
    }

    private getStatusLabel(message:any) {
        switch (message.documentStatus) {
            case 'NEW': return 'Create Document';
            case 'ISSUE': return 'Create Document';
            case 'REVOKE': return 'Revoke Document';
            case 'SUSPEND': return 'Suspend Document';
            case 'RESUME': return 'Resume Document';
            case 'FAILED': return 'Failed';
            default: return message.documentStatus || 'Create Document';
        }
    }

    private ifMint(message: any): boolean {
        return !!(
            message.__schemaName === 'MintToken' &&
            message.document &&
            message.document.credentialSubject &&
            message.document.credentialSubject[0]
        );
    }

    private searchSchema(message: any) {
        if (message.document && Array.isArray(message.document['@context'])) {
            for (const context of message.document['@context']) {
                for (const schema of this.schemas) {
                    if (schema.contextUrl === context) {
                        return schema;
                    }
                }
            }
        }
        return null;
    }

    private getIssuer(message: any): any {
        if (message.document && message.document.issuer) {
            return message.issuer;
        }
        if (message.document && message.document.issuer) {
            return message.document.issuer;
        }
        if (message.document && message.document.proof && message.document.proof.verificationMethod) {
            return message.document.proof.verificationMethod.split('#')[0];
        }
        return null;
    }

    private searchToken(message: any) {
        if (!message.__tokenId) {
            return null;
        }
        for (const token of this.tokens) {
            if (message.__tokenId === token.tokenId) {
                return token;
            }
        }
        return null;
    }

    private getMessageTimestamp(message: any): string {
        if (typeof message.id === 'string') {
            const [seconds, nanos] = message.id.split('.');
            const date = new Date(
                parseInt(seconds, 10) * 1000 +
                Math.floor(parseInt(nanos, 10) / 1000000)
            );
            let momentDate = moment(date);
            if (momentDate.isValid()) {
                return momentDate.format("YYYY-MM-DD, HH:mm:ss");
            }
        }
        return '';
    }

    private getVPDocuments(message: any): any[] {
        const documents: any[] = [];
        if (message.document && message.document.verifiableCredential) {
            for (const vc of message.document.verifiableCredential) {
                const item: any = { document: vc };
                item.__schema = this.searchSchema(item);
                item.__issuer = this.getIssuer(item);
                if (item.__schema) {
                    item.__schemaName = item.__schema.name;
                    item.__schemaDocument = item.__schema.document;
                    item.__schemaLabel = this.getSchemaLabel(item.__schema);
                }
                item.__name = item.__schemaLabel || 'Document';
                documents.push(item);
            }
        }
        return documents;
    }

    public onSelect(message: any) {
        this.selected = message;
    }

    public onSelectById(relationship: any) {
        for (const message of this.messages) {
            if (message.id === relationship.id) {
                this.selected = message;
            }
        }
    }

    public getTopicHeader(topic: any): string {
        if (topic.message) {
            switch (topic.message.messageType) {
                case 'USER_TOPIC': return 'Standard Registry';
                case 'POLICY_TOPIC': return 'Policy';
                case 'INSTANCE_POLICY_TOPIC':
                    return this.dashboardType === DashboardType.Advanced ? 'Policy instance' : topic.message.name;
                case 'DYNAMIC_TOPIC': return 'User defined';
            }
        }
        return 'Global';
    }

    public getTopicName(topic: any): string {
        if (topic.message) {
            switch (topic.message.messageType) {
                case 'USER_TOPIC': return '';
                case 'POLICY_TOPIC': return topic.message.name;
                case 'INSTANCE_POLICY_TOPIC': return 'Version: ' + (topic.__rationale?.version || 'N/A');
                case 'DYNAMIC_TOPIC': return topic.message.name;
            }
        }
        return '';
    }

    public onClear() {
        this.loading = true;
        this.policyEngineService.setBlockData(this.id, this.policyId, {
            filterValue: null
        }).subscribe(() => {
            this.loadData();
        }, (e) => {
            console.error(e.error);
            this.loading = false;
        });
    }

    public onSearch() {
        //'1685474753.342826629'
        this.loading = true;
        const filterValue = this.searchForm.value.value;
        this.policyEngineService.setBlockData(this.id, this.policyId, { filterValue }).subscribe(() => {
            this.loadData();
        }, (e) => {
            console.error(e.error);
            this.loading = false;
        });
    }

    public onDashboardType(event: any) {
        if (event) {
            this.dashboardType = DashboardType.Advanced;
        } else {
            this.dashboardType = DashboardType.Simplified;
        }
        setTimeout(() => {
            this.render(this.messages);
        }, 0);
    }

    public onOpenDocument(message: any) {
        const dialogRef = this.dialog.open(VCViewerDialog, {
            width: '850px',
            data: {
                document: message.document,
                title: 'Document',
                type: 'VC',
                viewDocument: true,
                schema: message.__schema,
            }
        });
        dialogRef.afterClosed().subscribe(async (result) => { });
    }

    private getRelationship(messages: any[], id: string): any {
        for (const message of messages) {
            if (message.id === id) {
                return message;
            }
        }
        return null;
    }


    private ifTopicMessage(message: any): boolean {
        return message.type === 'Topic';
    }

    private ifPolicyMessage(message: any): boolean {
        return message.type === 'Policy';
    }

    private ifInstanceMessage(message: any): boolean {
        return message.type === 'Instance-Policy';
    }

    private ifDIDMessage(message: any): boolean {
        return message.type === 'DID-Document';
    }

    private ifVCMessage(message: any): boolean {
        return message.type === 'VC-Document' && message.__schemaName !== 'MintToken';
    }

    private ifMintMessage(message: any): boolean {
        return message.type === 'VC-Document' && message.__schemaName === 'MintToken';
    }

    private ifVPMessage(message: any): boolean {
        return message.type === 'VP-Document';
    }

    private ifRoleMessage(message: any): boolean {
        return message.type === 'Role-Document';
    }

    private render(messages: any[]) {
        this.onResize();
        LeaderLine.positionByWindowResize = false;
        const container = document.getElementById('leader-line-container');
        if (!container) {
            return;
        }
        container.scrollTo(0, 0);
        const box = container.getBoundingClientRect();
        for (const elm of document.querySelectorAll('#leader-line-container > .leader-line')) {
            container.removeChild(elm);
        }
        for (const elm of document.querySelectorAll('#leader-line-container > .leader-line-areaAnchor')) {
            container.removeChild(elm);
        }
        const lines = [];
        for (const message of messages) {
            if (message.__relationships) {
                const relationships = message.__relationships.filter((r: any) => r.visible);
                const offset = 90 / (relationships.length + 1);
                for (let index = 0; index < relationships.length; index++) {
                    const options = {
                        x: -box.x,
                        y: -box.y + (offset * (index + 1)),
                        width: 190,
                        height: 0,
                        color: 'transparent'
                    };
                    const relationship = relationships[index];
                    const line = new LeaderLine(
                        LeaderLine.areaAnchor(document.getElementById(relationship.id), options),
                        LeaderLine.areaAnchor(document.getElementById(message.id), options), {
                        color: 'rgba(30, 130, 250, 0.5)',
                    });
                    lines.push(line);
                }
            }
        }
        for (const elm of document.querySelectorAll('.leader-line')) {
            container.appendChild(elm);
        }
        for (const elm of document.querySelectorAll('.leader-line-areaAnchor')) {
            container.appendChild(elm);
        }
        for (const line of lines) {
            line.position();
        }
    }

    @HostListener('window:resize', ['$event'])
    onResize() {
        const container = this.element.nativeElement.children[0];
        if (container) {
            const box = container.getBoundingClientRect();
            const height = window.innerHeight - box.top - 5;
            container.style.height = height + 'px';
        }
    }
}
