import { Component, Input, OnInit } from '@angular/core';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { PolicyHelper } from 'src/app/services/policy-helper.service';
import { WebSocketService } from 'src/app/services/web-socket.service';

/**
 * Component for display block of 'external-topic' type.
 */
@Component({
    selector: 'external-topic-block',
    templateUrl: './external-topic-block.component.html',
    styleUrls: ['./external-topic-block.component.css']
})
export class ExternalTopicBlockComponent implements OnInit {
    @Input('id') id!: string;
    @Input('policyId') policyId!: string;
    @Input('static') static!: any;

    loading: boolean = true;
    socket: any;

    topic: string | null;
    policy: string | null;
    policyTopic: string | null;
    schemas: string[];
    schemaId: string | null;

    constructor(
        private policyEngineService: PolicyEngineService,
        private wsService: WebSocketService,
        private policyHelper: PolicyHelper
    ) {
        this.topic = null;
        this.policy = null;
        this.policyTopic = null;
        this.schemas = [];
        this.schemaId = null;
    }

    ngOnInit(): void {
        if (!this.static) {
            this.socket = this.wsService.blockSubscribe(this.onUpdate.bind(this));
        }
        this.loadData();
    }

    ngOnDestroy(): void {
        if (this.socket) {
            this.socket.unsubscribe();
        }
    }

    onUpdate(blocks: string[]): void {
        if (Array.isArray(blocks) && blocks.includes(this.id)) {
            this.loadData();
        }
    }

    loadData() {
        this.loading = true;
        if (this.static) {
            this.setData(this.static);
            setTimeout(() => {
                this.loading = false;
            }, 500);
        } else {
            this.policyEngineService.getBlockData(this.id, this.policyId).subscribe((data: any) => {
                this.setData(data);
                setTimeout(() => {
                    this.loading = false;
                }, 1000);
            }, (e) => {
                console.error(e.error);
                this.loading = false;
            });
        }
    }

    setData(data: any) {
        if (data) {
            this.topic = data.topic;
            this.policy = data.policy;
            this.policyTopic = data.policyTopic;
            this.schemas = data.schemas || [];
            this.schemaId = data.schemaId;
        } else {
            this.topic = null;
            this.policy = null;
            this.policyTopic = null;
            this.schemas = [];
            this.schemaId = null;
        }
    }

    setTopic() {
        this.loading = true;
        const data = {
            operation: 'SetTopic',
            value: null
        };
        this.policyEngineService.setBlockData(this.id, this.policyId, data).subscribe(() => {
            this.loadData();
        }, (e) => {
            console.error(e.error);
            this.loading = false;
        });
    }

    setSchema() {
        this.loading = true;
        const data = {
            operation: 'SetSchema',
            value: null
        };
        this.policyEngineService.setBlockData(this.id, this.policyId, data).subscribe(() => {
            this.loadData();
        }, (e) => {
            console.error(e.error);
            this.loading = false;
        });
    }
}
