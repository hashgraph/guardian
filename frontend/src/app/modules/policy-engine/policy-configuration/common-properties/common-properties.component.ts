import { Component, ComponentFactoryResolver, EventEmitter, Input, OnInit, Output, SimpleChanges, ViewChild, ViewContainerRef } from '@angular/core';
import { BlockErrorActions, GenerateUUIDv4 } from '@guardian/interfaces';
import { RegisteredService } from '../../services/registered.service';
import {
    IBlockAbout,
    PolicyEvent,
    IModuleVariables,
    RoleVariables,
    PolicyFolder,
    PolicyItem,
    PolicyTemplate
} from '../../structures';

/**
 * Settings for all blocks.
 */
@Component({
    selector: 'common-properties',
    templateUrl: './common-properties.component.html',
    styleUrls: ['./common-properties.component.scss']
})
export class CommonPropertiesComponent implements OnInit {
    @ViewChild('configContainer', { read: ViewContainerRef }) configContainer!: ViewContainerRef;

    @Input('block') currentBlock!: PolicyItem;
    @Input('module') module!: PolicyFolder;
    @Input('readonly') readonly!: boolean;
    @Input('type') type!: string;

    @Output() onInit = new EventEmitter();
    @Output('onEditTags') onEditTags = new EventEmitter();

    loading: boolean = true;
    propHidden: any = {
        about: true,
        metaData: false,
        customProperties: false,
        eventsGroup: {}
    };

    block!: PolicyItem;
    about!: IBlockAbout | undefined;
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
    events: PolicyEvent[] = [];
    defaultEvent: boolean = false;
    customProperties!: any[] | undefined;
    roles!: RoleVariables[];
    private moduleVariables!: IModuleVariables | null;

    constructor(
        private registeredService: RegisteredService,
        private componentFactoryResolver: ComponentFactoryResolver
    ) {
    }

    ngOnInit(): void {
        this.roles = [];
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

    isOutputEvent(event: PolicyEvent) {
        return event.isSource(this.block);
    }

    isInputEvent(event: PolicyEvent) {
        return event.isTarget(this.block);
    }

    chanceType(event: any, item: PolicyEvent) {
        if (event.value != this.isInputEvent(item)) {
            const s = item.source;
            item.source = item.target;
            item.target = s;
            item.output = '';
            item.input = '';
        }
        this.onSave();
    }

    isInvalid(item: PolicyEvent) {
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
            id: GenerateUUIDv4(),
            source: this.block,
            target: null,
            output: '',
            input: '',
            disabled: false,
            actor: ''
        }
        this.block.createEvent(event);
    }

    onRemoveEvent(event: PolicyEvent) {
        this.module.removeEvent(event);
    }

    load(block: PolicyItem) {
        if (this.block != block && this.type == 'Events') {
            this.block = block;
            this.loadEvents(block);
        }
        if (this.block != block && this.type != 'Events') {
            this.loadEvents(block);
            this.loadComponent(block);
        }
    }

    loadEvents(block: PolicyItem) {
        this.events = block.events;
        const about = this.registeredService.getAbout(block, this.module);
        this.defaultEvent = about.defaultEvent;
    }

    private getAbout(block: PolicyItem | null): any {
        try {
            if (block && block.blockType) {
                return this.registeredService.getAbout(block, this.module);
            }
            return null;
        } catch (error) {
            return null;
        }
    }

    getOutputEvents(event: PolicyEvent): string[] {
        const about = this.getAbout(event.source);
        if (about && about.output) {
            return [{ label: '', value: null }, ...about.output];
        } else {
            return [];
        }
    }

    getInputEvents(event: PolicyEvent): string[] {
        const about = this.getAbout(event.target);
        if (about && about.input) {
            return about.input;
        } else {
            return [];
        }
    }

    loadComponent(block: PolicyItem) {
        if (!this.configContainer) {
            return;
        }

        this.moduleVariables = block.moduleVariables;
        this.roles = this.moduleVariables?.roles || [];

        this.about = undefined;
        this.customProperties = undefined;
        setTimeout(() => {
            this.block = block;
            if (!this.block.properties.onErrorAction) {
                this.block.properties.onErrorAction = BlockErrorActions.NO_ACTION;
            }
            this.configContainer.clear();
            const factory: any = this.registeredService.getProperties(block.blockType);
            const customProperties = this.registeredService.getCustomProperties(block.blockType);
            this.about = this.registeredService.bindAbout(block, this.module);
            this.loadFactory(factory, customProperties);
        }, 10);
    }

    private loadFactory(factory: any, customProperties: any) {
        if (factory) {
            this.loading = true;
            setTimeout(() => {
                if (customProperties) {
                    this.customProperties = customProperties;
                }
                let componentFactory = this.componentFactoryResolver.resolveComponentFactory(factory);
                let componentRef: any = this.configContainer.createComponent(componentFactory);
                componentRef.instance.currentBlock = this.currentBlock;
                componentRef.instance.readonly = this.readonly;
                setTimeout(() => {
                    this.loading = false;
                }, 200);
            }, 20);
        } else if (customProperties) {
            this.loading = true;
            setTimeout(() => {
                this.customProperties = customProperties;
                setTimeout(() => {
                    this.loading = false;
                }, 200);
            }, 20);
        } else {
            setTimeout(() => {
                this.loading = false;
            }, 200);
        }
    }

    onSave() {
        if (this.block) {
            this.block.emitUpdate();
        }
    }

    onChildrenApply(block: PolicyItem, currentBlock: PolicyItem) {
        if (!block) {
            return;
        }
        if (block.children) {
            block.children.forEach(child => this.onChildrenApply(child, currentBlock));
        }
        if (block !== currentBlock && currentBlock.permissions) {
            block.silentlySetPermissions(currentBlock.permissions.slice());
        }
        if (block === currentBlock) {
            this.module.emitUpdate();
        }
    }

    getPreparedInputEvents(item: PolicyEvent): { label: string, value: string }[] {
        const inputEvents = this.getInputEvents(item);

        return [{ label: 'None', value: '' }, ...inputEvents.map(event => ({ label: event, value: event }))];
    }

    public getTagsAmount(): number {
        return (this.block as any)?._tags?.tags?.length || 0;
    }

    public editTags() {
        this.onEditTags.emit();
    }

    public canEditTags(): boolean {
        if (this.module instanceof PolicyTemplate) {
            return this.module.isPublished;
        }

        return false;
    }
}

