import { Component, Input, OnInit } from '@angular/core';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';

/**
 * Component for display block of 'interfaceContainerBlock' type.
 */
@Component({
    selector: 'container-block',
    templateUrl: './container-block.component.html',
    styleUrls: ['./container-block.component.css']
})
export class ContainerBlockComponent implements OnInit {
    @Input('id') id!: string;
    @Input('policyId') policyId!: string;
    @Input('static') static!: any;

    loading: boolean = true;
    socket: any;

    blocks: any;
    activeBlockId: any;
    activeBlock: any;
    isActive = false;
    type!: string | null;

    constructor(private policyEngineService: PolicyEngineService) {
    }

    ngOnInit(): void {
        if (!this.static) {
            this.socket = this.policyEngineService.subscribe(this.onUpdate.bind(this));
        }
        this.loadData();
    }

    ngOnDestroy(): void {
        if (this.socket) {
            this.socket.unsubscribe();
        }
    }

    onUpdate(id: string): void {
        if (this.id == id) {
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
            this.policyEngineService.getData(this.id, this.policyId).subscribe((data: any) => {
                this.setData(data);
                setTimeout(() => {
                    this.loading = false;
                }, 500);
            }, (e) => {
                console.error(e.error);
                this.loading = false;
            });
        }
    }

    setData(data: any) {
        if (data) {
            const uiMetaData = data.uiMetaData || {};
            this.isActive = data.isActive;
            this.type = uiMetaData.type;
            this.blocks = data.blocks || [];
            this.blocks = this.blocks.filter((b: any) => (b && b.isActive));
            this.activeBlock = this.blocks.find((b: any) => b.id == this.activeBlock);
            if (!this.activeBlock) {
                this.onBlockChange(0);
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
        this.activeBlock = this.blocks[event];
        this.activeBlockId = this.activeBlock ? this.activeBlock.id : null;
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
}
