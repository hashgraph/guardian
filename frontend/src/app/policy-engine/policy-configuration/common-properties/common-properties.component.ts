import { Component, ComponentFactoryResolver, EventEmitter, Input, OnInit, Output, SimpleChanges, ViewChild, ViewContainerRef } from '@angular/core';
import { Schema, Token } from 'interfaces';
import { RegisteredBlocks } from '../../registered-blocks';
import { BlockNode } from '../../helpers/tree-data-source/tree-data-source';

/**
 * Settings for all blocks.
 */
@Component({
    selector: 'common-properties',
    templateUrl: './common-properties.component.html',
    styleUrls: ['./common-properties.component.css']
})
export class CommonPropertiesComponent implements OnInit {
    @ViewChild("configContainer", { read: ViewContainerRef }) configContainer!: ViewContainerRef;

    @Input('block') currentBlock!: BlockNode;
    @Input('schemes') schemes!: Schema[];
    @Input('tokens') tokens!: Token[];
    @Input('all') allBlocks!: BlockNode[];
    @Input('readonly') readonly!: boolean;
    @Input('roles') roles!: string[];
    @Output() onInit = new EventEmitter();

    propHidden: any = {
        metaData: false,
    };

    block!: BlockNode;

    constructor(
        public registeredBlocks: RegisteredBlocks,
        private componentFactoryResolver: ComponentFactoryResolver
    ) {
    }

    ngOnInit(): void {
        this.onInit.emit(this);
        this.load(this.currentBlock);
    }

    ngOnChanges(changes: SimpleChanges) {
        this.load(this.currentBlock);
    }

    onHide(item: any, prop: any) {
        item[prop] = !item[prop];
    }

    load(block: BlockNode) {
        this.block = block;
        this.loadComponent(block);
    }

    loadComponent(block: BlockNode) {
        if (!this.configContainer) {
            return;
        }
        this.configContainer.clear();
        const factory: any = this.registeredBlocks.getProperties(block.blockType);
        if (factory) {
            let componentFactory = this.componentFactoryResolver.resolveComponentFactory(factory);
            let componentRef: any = this.configContainer.createComponent(componentFactory);
            componentRef.instance.target = this.currentBlock;
            componentRef.instance.schemes = this.schemes;
            componentRef.instance.all = this.allBlocks;
            componentRef.instance.readonly = this.readonly;
            componentRef.instance.tokens = this.tokens;
            componentRef.instance.roles = this.roles;
        }
    }
}
