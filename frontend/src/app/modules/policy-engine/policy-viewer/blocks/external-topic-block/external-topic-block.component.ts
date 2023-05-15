import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
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

    public documentTopicId: string | null = null;
    public instanceTopicId: string | null = null;
    public policyTopicId: string | null = null;
    public documentMessage: any = null;
    public policyInstanceMessage: any = null;
    public policyMessage: any = null;
    public schemas: any[] | null = null;
    public schema: any = null;
    public lastUpdate: string | null = null;
    public status: string | null = null;

    public topicForm = this.fb.group({
        topicId: ['0.0.4605481', Validators.required],
    });
    public schemaForm = this.fb.group({
        schemaId: ['', Validators.required],
    });

    constructor(
        private policyEngineService: PolicyEngineService,
        private wsService: WebSocketService,
        private policyHelper: PolicyHelper,
        private fb: FormBuilder
    ) {
        this.documentTopicId = null;
        this.instanceTopicId = null;
        this.policyTopicId = null;
        this.documentMessage = null;
        this.policyInstanceMessage = null;
        this.policyMessage = null;
        this.schemas = null;
        this.schema = null;
        this.lastUpdate = null;
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
            this.status = data.status;
            this.documentTopicId = data.documentTopicId;
            this.instanceTopicId = data.instanceTopicId;
            this.policyTopicId = data.policyTopicId;
            this.documentMessage = data.documentMessage;
            this.policyInstanceMessage = data.policyInstanceMessage;
            this.policyMessage = data.policyMessage;
            this.schemas = data.schemas;
            this.schema = data.schema;
            this.lastUpdate = data.lastUpdate;
            if(this.status === 'NEED_SCHEMA' && this.schemas?.length === 1) {
                this.schemaForm.setValue({ 
                    schemaId: this.schemas[0].id
                })
            }
        } else {
            this.status = null;
            this.documentTopicId = null;
            this.instanceTopicId = null;
            this.policyTopicId = null;
            this.documentMessage = null;
            this.policyInstanceMessage = null;
            this.policyMessage = null;
            this.schemas = null;
            this.schema = null;
            this.lastUpdate = null;
        }
    }

    public setTopic() {
        this.loading = true;
        const form = this.topicForm.value;
        const data = {
            operation: 'SetTopic',
            value: form?.topicId
        };
        this.policyEngineService.setBlockData(this.id, this.policyId, data).subscribe(() => {
            this.loadData();
        }, (e) => {
            console.error(e.error);
            this.loading = false;
        });
    }

    public setSchema() {
        this.loading = true;
        const form = this.schemaForm.value;
        const data = {
            operation: 'SetSchema',
            value: form?.schemaId
        };
        this.policyEngineService.setBlockData(this.id, this.policyId, data).subscribe(() => {
            this.loadData();
        }, (e) => {
            console.error(e.error);
            this.loading = false;
        });
    }

    public onRefresh() {
        this.loading = true;
        const data = {
            operation: 'Refresh',
            value: 'Refresh'
        };
        this.policyEngineService.setBlockData(this.id, this.policyId, data).subscribe(() => {
            this.loadData();
        }, (e) => {
            console.error(e.error);
            this.loading = false;
        });
    }
}
