import { Component, Input, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { VCViewerDialog } from 'src/app/modules/schema-engine/vc-dialog/vc-dialog.component';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { PolicyHelper } from 'src/app/services/policy-helper.service';
import { WebSocketService } from 'src/app/services/web-socket.service';

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
    public topics!: any[];
    public gridSize!: number;
    public messages!: any[];
    public lines!: any[];
    public schemas!: any[];
    public gridTemplateRows!: string;
    public gridTemplateColumns!: string;
    public selected: any;
    public status!: string;

    constructor(
        private policyEngineService: PolicyEngineService,
        private wsService: WebSocketService,
        private policyHelper: PolicyHelper,
        private dialog: MatDialog
    ) {

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
        if (data) {
            this.status = data.status;
            this.report = data.report;
            if (this.report) {
                this.topics = [];
                this.messages = [];
                this.schemas = this.report.schemas;
                this.parseTopics(this.report.topics, null, 1);
                this.gridSize = 0;
                for (const topic of this.topics) {
                    for (const message of topic.messages) {
                        message.__order = message.order + 1;
                        if (message.type === 'VC-Document') {
                            message.__schema = this.searchSchema(message);
                        }
                        if (message.__schema) {
                            message.__schemaName = message.__schema.name;
                            message.__schemaDocument = message.__schema.document;
                        }
                        this.gridSize = Math.max(this.gridSize, message.__order);
                        this.messages.push(message);
                    }
                    if (topic.__parent) {
                        topic.__start = 100 * topic.__parent.__order;
                        topic.__end = 100 * topic.__order;
                        topic.__height = topic.__end - topic.__start - 50;
                    }
                }
                for (const message of this.messages) {
                    if (message.relationships) {
                        message.__relationships = [];
                        for (const relationship of message.relationships) {
                            message.__relationships.push({
                                id: relationship,
                                name: this.getRelationshipName(relationship)
                            })
                        }
                    }
                }
                this.gridTemplateColumns = 'repeat(' + this.gridSize + ', 230px)';
                this.gridTemplateRows = 'repeat(' + this.topics.length + ', 100px)';
                // debugger
                console.log(this.topics);
            } else {
                this.report = null;
                this.topics = [];
                this.messages = [];
                this.schemas = [];
            }
        } else {
            this.gridSize = 0;
            this.gridTemplateRows = '';
            this.gridTemplateColumns = '';
            this.report = null;
            this.topics = [];
            this.messages = [];
            this.schemas = [];
        }
        setTimeout(() => {
            this.render();
        }, 100);
    }

    private parseTopics(topics: any[], parent: any, offset: number) {
        for (const topic of topics) {
            topic.__parent = parent;
            topic.__offset = 20 * offset;
            this.topics.push(topic);
            topic.__order = this.topics.length;
            if (topic.children) {
                this.parseTopics(topic.children, topic, offset + 1);
            }
        }
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
                case 'USER_TOPIC': return 'User Topic';
                case 'POLICY_TOPIC': return 'Policy Topic';
                case 'INSTANCE_POLICY_TOPIC': return 'Instance Topic';
                case 'DYNAMIC_TOPIC': return 'User Defined Topic';
            }
        }
        return 'Topic';
    }

    public onSearch() {
        this.loading = true;
        this.policyEngineService.setBlockData(this.id, this.policyId, {
            filterValue: '1685474753.342826629'
        }).subscribe(() => {
            this.loadData();
        }, (e) => {
            console.error(e.error);
            this.loading = false;
        });
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

    private getRelationshipName(id: string): string {
        for (const message of this.messages) {
            if (message.id === id) {
                return message.__schemaName || 'Document';
            }
        }
        return 'Document';
    }

    private render() {
        LeaderLine.positionByWindowResize = false;
        const container = document.getElementById('leader-line-container');
        if (!container) {
            return;
        }
        const box = container.getBoundingClientRect();
        for (const elm of document.querySelectorAll('#leader-line-container > .leader-line')) {
            container.removeChild(elm);
        }
        for (const elm of document.querySelectorAll('#leader-line-container > .leader-line-areaAnchor')) {
            container.removeChild(elm);
        }
        this.lines = [];
        for (const message of this.messages) {
            if (message.relationships && message.relationships.length) {
                const offset = 90 / (message.relationships.length + 1);
                for (let index = 0; index < message.relationships.length; index++) {
                    const options = {
                        x: -box.x,
                        y: -box.y + (offset * (index + 1)),
                        width: 190,
                        height: 0,
                        color: 'transparent'
                    };
                    const id = message.relationships[index];
                    const line = new LeaderLine(
                        LeaderLine.areaAnchor(document.getElementById(id), options),
                        LeaderLine.areaAnchor(document.getElementById(message.id), options), {
                        color: 'rgba(30, 130, 250, 0.5)',
                    });
                    this.lines.push(line);
                }
            }
        }
        for (const elm of document.querySelectorAll('.leader-line')) {
            container.appendChild(elm);
        }
        for (const elm of document.querySelectorAll('.leader-line-areaAnchor')) {
            container.appendChild(elm);
        }
        for (const line of this.lines) {
            line.position();
        }
        (window as any).__ttt = this.lines
    }
}
