import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { PolicyHelper } from 'src/app/services/policy-helper.service';
import { WebSocketService } from 'src/app/services/web-socket.service';
import { PolicyProgressService } from '../../../services/policy-progress.service';

/**
 * Component for display block of 'interfaceContainerBlock' type.
 */
@Component({
    selector: 'container-block',
    templateUrl: './container-block.component.html',
    styleUrls: ['./container-block.component.scss'],
})
export class ContainerBlockComponent implements OnInit, OnDestroy {
    @Input('id') id!: string;
    @Input('policyId') policyId!: string;
    @Input('static') static!: any;

    loading: boolean = true;
    socket: any;
    params: any;

    blocks: any;
    activeBlockId: any;
    activeBlock: any;
    isActive = false;
    type!: string | null;
    selectedIndex: number = 0;

    constructor(
        private policyEngineService: PolicyEngineService,
        private wsService: WebSocketService,
        private policyHelper: PolicyHelper,
        private policyProgressService: PolicyProgressService
    ) {
    }

    ngOnInit(): void {
        if (!this.static) {
            this.socket = this.wsService.blockSubscribe(
                this.onUpdate.bind(this)
            );
        }
        this.params = this.policyHelper.subscribe(
            this.onUpdateParams.bind(this)
        );
        this.loadData();
    }

    ngOnDestroy(): void {
        if (this.socket) {
            this.socket.unsubscribe();
        }
        if (this.params) {
            this.params.unsubscribe();
        }
    }

    onUpdate(blocks: string[]): void {
        if (Array.isArray(blocks) && blocks.includes(this.id)) {
            this.loadData();
        }
    }

    onUpdateParams() {
        const id = this.policyHelper.getParams(this.id);
        if (this.blocks && this.activeBlockId != id) {
            this.activeBlockId = id;
            this.selectedIndex = this.blocks.findIndex(
                (b: any) => b.id == this.activeBlockId
            );
            this.activeBlock = this.blocks[this.selectedIndex];
            if (!this.activeBlock) {
                this.onBlockChange(0);
            }
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
            this.policyEngineService
                .getBlockData(this.id, this.policyId)
                .subscribe(
                    (data: any) => {
                        this.setData(data);
                        setTimeout(() => {
                            this.loading = false;
                        }, 500);
                    },
                    (e) => {
                        console.error(e.error);
                        this.loading = false;
                    }
                );
        }
    }

    setData(data: any) {
        if (data) {
            const uiMetaData = data.uiMetaData || {};
            this.isActive = true;
            this.type = uiMetaData.type;
            this.blocks = data.blocks || [];
            this.blocks = this.blocks.filter((b: any) => !!b);

            this.activeBlockId = this.policyHelper.getParams(this.id);
            this.selectedIndex = this.blocks.findIndex(
                (b: any) => b.id == this.activeBlockId
            );
            this.activeBlock = this.blocks[this.selectedIndex];
            if (!this.activeBlock) {
                this.onBlockChange(0);
            }

            if (data.blocks && data.blocks.length > 0) {
                data.blocks.forEach((block: any) => {
                    if (block) {
                        this.policyProgressService.addBlock(block.id, block);
                    }
                });
            }
        } else {
            this.blocks = null;
            this.activeBlock = null;
            this.activeBlockId = null;
            this.isActive = false;
            this.type = null;
        }
    }

    onBlockChange(event: any) {
        this.selectedIndex = event;
        this.activeBlock = this.blocks[this.selectedIndex];
        this.activeBlockId = this.activeBlock ? this.activeBlock.id : null;
        this.policyHelper.setParams(this.id, this.activeBlockId);
    }

    getTitle(block: any) {
        if (block.uiMetaData && block.uiMetaData.title) {
            return block.uiMetaData.title;
        }
        if (block.content) {
            return block.content;
        }
        return block.blockType;
    }

    canDisplayTabs(): boolean {
        return !this.policyProgressService.getHasNavigation();
    }
}
