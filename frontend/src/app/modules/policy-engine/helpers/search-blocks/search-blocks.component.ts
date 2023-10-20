import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { ThemeService } from 'src/app/services/theme.service';
import { PolicyBlock, PolicyTemplate } from '../../structures';
import { RegisteredService } from '../../services/registered.service';

interface IGroup {
    name: string;
    items: IGroupItem[];
}

interface IGroupItem {
    countColor: string;
    rateColor: string;
    collapsed: boolean;
    rate: number;
    count: number;
    tree: IBlock[];
    target?: PolicyBlock;
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
    rate: number;
    rateColor: string;
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
    public root: PolicyTemplate;

    constructor(
        private registeredService: RegisteredService,
        private themeService: ThemeService
    ) {
        this.root = new PolicyTemplate();
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

        let collapsed = false;
        let maxCount = 0;
        for (const group of this.groups) {
            for (const item of group.items) {
                item.collapsed = collapsed;
                collapsed = true;
                maxCount = Math.max(maxCount, item.count);
            }
        }
        for (const group of this.groups) {
            for (const item of group.items) {
                item.countColor = this.getColor(item.count, maxCount);
                item.rateColor = this.getColor(item.rate, 100);
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
        const rate = row.hash % 1000;
        const groupItem: IGroupItem = {
            collapsed: true,
            count: 0,
            rate,
            tree: [],
            countColor: '',
            rateColor: ''
        }
        if (Array.isArray(row.pairs)) {
            for (const pair of row.pairs) {
                const block = this.createBlock(pair.source);
                block.rate = pair.hash;
                block.rateColor = this.getColor(block.rate, 100);
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
            if(block.selected) {
                groupItem.target = block.node;
            }
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
            node: new PolicyBlock(row.config, null),
            selected: false,
            rate: 0,
            rateColor: ''
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

    public onCollapsed(item: any): void {
        const collapsed = !item.collapsed;
        for (const group of this.groups) {
            for (const item of group.items) {
                item.collapsed = true;
            }
        }
        item.collapsed = collapsed;
    }

    private getColor(value: number, max: number): string {
        if (value < max * 0.7) {
            return 'red';
        }
        // if (value < max * 0.7) {
        //     return 'yellow';
        // }
        return 'green';
    }
}

