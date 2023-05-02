import { Component, Input, OnInit } from '@angular/core';
import { SchemaHelper } from '@guardian/interfaces';
import { Observable } from 'rxjs';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { PolicyHelper } from 'src/app/services/policy-helper.service';
import { TagsService } from 'src/app/services/tag.service';
import { WebSocketService } from 'src/app/services/web-socket.service';

/**
 * Component for display block of 'tagManager' types.
 */
@Component({
    selector: 'app-tags-manager-block',
    templateUrl: './tags-manager-block.component.html',
    styleUrls: ['./tags-manager-block.component.css']
})
export class TagsManagerBlockComponent implements OnInit {
    @Input('id') id!: string;
    @Input('policyId') policyId!: string;
    @Input('static') static!: any;

    public isActive = false;
    public loading: boolean = true;
    public socket: any;

    public data: any;
    public tags: any;
    public target: any;
    public entity: any;
    public owner: any;

    public tagsService: any;
    public tagSchemas: any[] = [];

    constructor(
        private policyEngineService: PolicyEngineService,
        private wsService: WebSocketService,
        private policyHelper: PolicyHelper,
    ) {
        this.tagsService = {
            create: (tag: any): Observable<any> => {
                return this.policyEngineService.setBlockData(this.id, this.policyId, { operation: 'create', tag });
            },

            search: (entity: string, targets: string[]): Observable<any> => {
                return this.policyEngineService.setBlockData(this.id, this.policyId, { operation: 'search', entity, targets });
            },

            synchronization: (entity: string, target: string): Observable<any> => {
                return this.policyEngineService.setBlockData(this.id, this.policyId, { operation: 'synchronization', entity, target });
            },

            delete: (uuid: string): Observable<boolean> => {
                return this.policyEngineService.setBlockData(this.id, this.policyId, { operation: 'delete', uuid });
            }
        }
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
            this.policyEngineService.getBlockData(this.id, this.policyId).subscribe((data: any) => {
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
            this.data = data.data;
            this.tags = data.tags;
            if (this.tags) {
                this.target = this.tags.target;
                this.entity = this.tags.entity;
                this.owner = this.tags.owner;
            } else {
                this.target = null;
                this.entity = null;
                this.owner = null;
            }
            const tagSchemas = data.tagSchemas || [];
            this.tagSchemas = SchemaHelper.map(tagSchemas);
            this.isActive = true;
        } else {
            this.tags = null;
            this.target = null;
            this.entity = null;
            this.owner = null;
            this.tagSchemas = [];
            this.isActive = false;
        }
    }
}
