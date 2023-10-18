import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { ThemeService } from 'src/app/services/theme.service';
import { PolicyBlock } from '../../policy-engine/structures';
import { RegisteredService } from '../../policy-engine/services/registered.service';

interface IGroup {
    name: string;
    items: IGroupItem[];
}

interface IGroupItem {
    count: number;
    tree: IBlock[];
}

interface IBlock {
    id: string;
    lvl: number;
    offset: number;
    name: string;
    icon: string;
    type: string;
    node: PolicyBlock;
    selected: boolean;
}

/**
 * Settings.
 */
@Component({
    selector: 'search-blocks',
    templateUrl: './search-blocks.component.html',
    styleUrls: ['./search-blocks.component.scss']
})
export class SearchBlocksComponent implements OnInit {
    @Input('config') config!: any;
    @Input('value') value!: any;
    @Output('action') action = new EventEmitter();

    public loading: boolean = false;
    public icon: string = 'search';
    public title: string = 'Result';
    public save: boolean = false;

    public groups: IGroup[] = [];

    constructor(
        private registeredService: RegisteredService,
        private themeService: ThemeService
    ) {
    }

    ngOnInit(): void {
        if (this.config) {
            this.icon = this.config.icon || 'settings';
            this.title = this.config.title || 'Result';
            this.save = !!this.config.save;
        }
    }

    ngOnChanges(changes: any): void {
        this.update();
    }

    private update() {
        this.groups = [];
        if (Array.isArray(this.value)) {
            for (const row of this.value) {
                const group = this.createGroup(row);
                this.groups.push(group);
            }
        }
    }

    private createGroup(row: any): IGroup {
        const group: IGroup = {
            name: row.name,
            items: []
        }
        if (Array.isArray(row.chains)) {
            for (const chain of row.chains) {
                const item = this.createGroupItem(chain);
                group.items.push(item);
            }
        }
        return group;
    }

    private createGroupItem(row: any): IGroupItem {
        const groupItem: IGroupItem = {
            count: 0,
            tree: []
        }
        if (Array.isArray(row.pairs)) {
            for (const pair of row.pairs) {
                const block = this.createBlock(pair.source);
                groupItem.tree.push(block);
            }
        }
        groupItem.count = groupItem.tree.length;
        const target: any = row.target || {};
        let min = Infinity;
        for (const block of groupItem.tree) {
            min = Math.min(min, block.lvl);
        }
        for (const block of groupItem.tree) {
            block.offset = 20 * (block.lvl - min);
            block.selected = block.id === target.id;
        }
        return groupItem;
    }

    private createBlock(row: any): IBlock {
        const lvl = (row.path?.length || 0);
        const groupItem: IBlock = {
            lvl,
            offset: 0,
            id: row.id,
            name: row.tag || row.blockType,
            icon: this.registeredService.getIcon(row.blockType),
            type: row.blockType,
            node: new PolicyBlock(row, null),
            selected: false
        }
        return groupItem;
    }

    public onCancel() {
        this.action.emit({
            type: 'cancel'
        })
    }

    public onSave() {
        this.action.emit({
            type: 'save'
        })
    }

    public blockStyle(block: IBlock): any {
        return this.themeService.getStyle(block.node);
    }
}

