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
    @Input('events') allEvents!: any[];

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
    inputEvents: any[] = [];
    outputEvents: any[] = [];
    defaultEvent: boolean = false;
    
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

    isOutputEvent(event: any) {
        return !!event.source && event.source.tag == this.block.tag;
    }

    isInputEvent(event: any) {
        return !!event.target &&
            event.target.tag == this.block.tag &&
            !this.isOutputEvent(event);
    }

    chanceType(event: any, item: any) {
        if (event.value != this.isInputEvent(item)) {
            const s = item.source;
            item.source = item.target;
            item.target = s;
            item.output = "";
            item.input = "";
        }
    }

    isInvalid(item: any) {
        return (
            !item.target ||
            !item.source ||
            !item.output ||
            !item.input ||
            (item.target == item.source)
        );
    }

    addEvent() {
        const event = {
            id: this.registeredBlocks.generateUUIDv4(),
            source: this.block,
            target: null,
            output: "",
            input: "",
            disabled: false
        }
        this.allEvents.push(event);
        this.block.events.push({
            id: event.id,
        });
    }

    onRemoveEvent(event: any) {
        const i1 = this.allEvents.indexOf(event);
        this.allEvents.splice(i1, 1);
        const i2 = this.block.events.findIndex((e: any) => e.id == event.id);
        this.block.events.splice(i2, 1);
    }

    load(block: BlockNode) {
        if (this.block != block && this.type == 'Events') {
            this.block = block;
            this.loadEvents(block);
        }
        if (this.block != block && this.type != 'Events') {
            this.loadEvents(block);
            this.loadComponent(block);
        }
    }

    loadEvents(block: BlockNode) {
        block.events = block.events || [];
        const about = this.registeredBlocks.getAbout(block.blockType, block);
        this.inputEvents = about.input;
        this.outputEvents = about.output;
        this.defaultEvent = about.defaultEvent;
    }

    getIcon(block: any) {
        return this.registeredBlocks.getIcon(block.blockType);
    }

    getOutputEvents(event: any) {
        try {
            if (event.source && event.source.blockType) {
                const about = this.registeredBlocks.getAbout(event.source.blockType, event.source);
                return about.output || [];
            }
            return [];
        } catch (error) {
            return [];
        }
    }

    getInputEvents(event: any) {
        try {
            if (event.target && event.target.blockType) {
                const about = this.registeredBlocks.getAbout(event.target.blockType, event.target);
                return about.input || [];
            }
            return [];
        } catch (error) {
            return [];
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
