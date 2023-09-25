import { Component, EventEmitter, Inject, Input, Output, SimpleChanges } from '@angular/core';
import { RegisteredService } from '../../services/registered.service';
import { PolicyBlock, PolicyFolder } from '../../structures';

/**
 * SelectBlock.
 */
@Component({
    selector: 'select-block',
    templateUrl: './select-block.component.html',
    styleUrls: ['./select-block.component.css']
})
export class SelectBlock {
    @Input('root') root!: PolicyFolder;
    @Input('blocks') blocks!: PolicyBlock[];
    @Input('readonly') readonly!: boolean;
    @Input('value') value: string | PolicyBlock | null | undefined;
    @Input('type') type!: string;
    @Output('valueChange') valueChange = new EventEmitter<any>();
    @Output('change') change = new EventEmitter<any>();

    public text: string | null | undefined;
    public search: string = '';
    public searchData?: any[];
    private searchTimeout!: any;
    private data?: any[];

    constructor(private registeredService: RegisteredService) {
    }

    onChange() {
        this.text = this.getText(this.value);
        this.valueChange.emit(this.value);
        this.change.emit();
    }

    ngOnChanges(changes: SimpleChanges) {
        this.text = this.getText(this.value);
        setTimeout(() => {
            this.data = [];
            if (this.blocks) {
                for (const block of this.blocks) {
                    const search = (block.tag || '').toLocaleLowerCase();
                    const root = block === this.root;
                    const name = this.getText(block);
                    const icon = this.getIcon(block);
                    this.data.push({
                        name,
                        value: this.type === 'object' ? block : block.tag,
                        icon: icon.icon,
                        svg: icon.svg,
                        root,
                        search
                    });
                }
            }
            this.update();
        }, 0);
    }

    private getText(value: string | PolicyBlock | null | undefined): string {
        if (value && typeof value === 'object') {
            if (value === this.root) {
                if (this.root.isModule) {
                    return 'Module';
                } else if (this.root.isTool) {
                    return 'Tool';
                } else {
                    return 'Policy';
                }
            } else {
                return value.localTag;
            }
        } if (value) {
            return value;
        } else {
            return '';
        }
    }

    private getIcon(value: PolicyBlock) {
        if (value === this.root) {
            if (this.root.isModule) {
                return { icon: 'policy-module', svg: true };
            } else if (this.root.isTool) {
                return { icon: 'handyman', svg: false };
            } else {
                return { icon: 'article', svg: false };
            }
        } else {
            return {
                icon: this.registeredService.getIcon(value.blockType),
                svg: false
            };
        }
    }

    public onSearch(event: any) {
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
            this.update();
        }, 200);
    }

    public update() {
        const search = this.search ? this.search.toLowerCase() : null;
        if (search) {
            this.searchData = this.data?.filter(item => item.search.indexOf(search) !== -1);
        } else {
            this.searchData = this.data;
        }
    }
}