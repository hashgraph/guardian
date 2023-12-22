import { ComponentRef, Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { IBlock } from '../structures';

@Injectable()
export class PolicyProgressService {
    private _map: Map<string, {
        containerId: string;
        block: IBlock<any>
    }> = new Map();
    private _componentRefsMap: Map<string, ComponentRef<any>> = new Map();
    private _role: string;
    private _hasNavigation: boolean;
    private _currentStepIndex: number;
    private _currentStepBlockId: string;

    private dataSubject: BehaviorSubject<any> = new BehaviorSubject(null);
    data$: Observable<any> = this.dataSubject.asObservable();

    constructor() {
    }

    updateData(data: any): void {
        if (data.role) {
            this._role = data.role;
        }
        this.dataSubject.next(data);
    }

    getCurrentRole(): string {
        return this._role;
    }

    getHasNavigation(): boolean {
        return this._hasNavigation;
    }

    setHasNavigation(value: boolean): void {
        this._hasNavigation = value;
    }

    addBlock(id: string, block: IBlock<any>) {
        let containerId: string = this.getTabsContainerBlock(block.id);
        this._map.set(id, {containerId, block});
    }

    private getTabsContainerBlock(blockId: string): string {
        let containerId: string = '';
        this._componentRefsMap.forEach(item => {
            if (item.instance.blocks && item.instance.blocks.length > 0) {
                item.instance.blocks.forEach((itemBlock: IBlock<any>) => {
                    if (itemBlock?.id === blockId) {
                        if (item.instance.type == 'tabs') {
                            containerId = item.instance.id;
                        } else {
                            containerId = this.getTabsContainerBlock(item.instance.id)
                        }
                    }
                });
            }
        });
        return containerId;
    }

    getBlockById(id: string): any {
        return this._map.get(id);
    }

    addComponentRef(id: string, component: ComponentRef<any>) {
        this._componentRefsMap.set(id, component);
    }

    getComponentRefById(id: string): ComponentRef<any> | undefined {
        return this._componentRefsMap.get(id);
    }

    stepHasAction(blockId: string): boolean {
        // For click on steps like dialog buttons
        // const button = this.policyProgressService.getComponentRefById(blockId);
        // if (button && button.instance.type == 'dialog' && button.instance.onDialog) {
        //     return true;
        // }

        const block = this.getBlockById(blockId);
        if (block) {
            const container = this.getComponentRefById(block.containerId);
            if (container?.instance.onBlockChange) {
                const index = container?.instance.blocks.findIndex((itm: any) => itm.id == blockId);
                if (index >= 0) {
                    return true;
                }
            }
        }
        return false;
    }

    runStepAction(blockId: string): void {
        // For click on steps like dialog buttons
        // const button = this.policyProgressService.getComponentRefById(blockId);
        // if (button && button.instance.type == 'dialog' && button.instance.onDialog) {
        //     button.instance.onDialog();
        // }

        const block = this.getBlockById(blockId);
        if (block) {
            const container = this.getComponentRefById(block.containerId);
            if (container?.instance.onBlockChange) {
                const index = container?.instance.blocks.findIndex((itm: any) => itm.id == blockId);
                if (index >= 0) {
                    container?.instance.onBlockChange(index);
                }
            }
        }
    }

    updateCurrentStep(index: number, blockId: string): void {
        this._currentStepIndex = index;
        this._currentStepBlockId = blockId;
    }

    getCurrentStepIndex(): number {
        return this._currentStepIndex;
    }

    getCurrentStepBlockId(): string {
        return this._currentStepBlockId;
    }
}
