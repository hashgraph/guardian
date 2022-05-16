import { Component, ComponentFactoryResolver, EventEmitter, Input, OnInit, Output, SimpleChanges, ViewChild, ViewContainerRef } from '@angular/core';
import { BlockErrorActions, Schema, Token } from 'interfaces';
import { IBlockAbout, RegisteredBlocks } from '../../registered-blocks';
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
    @Input('topics') topics!: any[];
    @Input('type') type!: string;

    @Output() onInit = new EventEmitter();

    propHidden: any = {
        about: true,
        metaData: false,
        eventsGroup: {}
    };

    block!: BlockNode;
    about!: IBlockAbout;
    errorActions = [
        {
            label: 'No action',
            value: BlockErrorActions.NO_ACTION
        },
        {
            label: 'Retry',
            value: BlockErrorActions.RETRY
        },
        {
            label: 'Go to step',
            value: BlockErrorActions.GOTO_STEP
        },
        {
            label: 'Go to tag',
            value: BlockErrorActions.GOTO_TAG
        }
    ];
    events: any[] = [];

    constructor(
        public registeredBlocks: RegisteredBlocks,
        private componentFactoryResolver: ComponentFactoryResolver
    ) {
    }

    ngOnInit(): void {
        this.onInit.emit(this);
        this.load(this.currentBlock);
    }

    ngAfterViewInit(): void {
        this.load(this.currentBlock);
    }

    ngOnChanges(changes: SimpleChanges) {
        this.load(this.currentBlock);
    }

    onHide(item: any, prop: any) {
        item[prop] = !item[prop];
    }



    addEvent() {
        this.events.push({
            __output: true,
            source: "",
            target: "",
            output: "",
            input: "",
            disabled: false
        });
    }

    onRemoveEvent(i: number) {
        this.events.splice(i, 1);
    }

    load(block: BlockNode) {
        if (this.block != block && this.type == 'Events') {
            this.block = block;
        }
        if (this.block != block && this.type != 'Events') {
            this.loadComponent(block);
        }
    }

    loadComponent(block: BlockNode) {
        if (!this.configContainer) {
            return;
        }
        setTimeout(() => {
            this.block = block;
            if (!this.block.onErrorAction) {
                this.block.onErrorAction = BlockErrorActions.NO_ACTION;
            }
            this.configContainer.clear();
            const factory: any = this.registeredBlocks.getProperties(block.blockType);
            this.about = this.registeredBlocks.bindAbout(block.blockType, block);
            if (factory) {
                let componentFactory = this.componentFactoryResolver.resolveComponentFactory(factory);
                let componentRef: any = this.configContainer.createComponent(componentFactory);
                componentRef.instance.target = this.currentBlock;
                componentRef.instance.schemes = this.schemes;
                componentRef.instance.all = this.allBlocks;
                componentRef.instance.readonly = this.readonly;
                componentRef.instance.tokens = this.tokens;
                componentRef.instance.roles = this.roles;
                componentRef.instance.topics = this.topics;
            }
        })
    }
}
