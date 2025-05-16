import {
    AfterViewInit,
    ChangeDetectionStrategy, ChangeDetectorRef,
    Component,
    EventEmitter,
    Input,
    Output,
    SimpleChanges
} from '@angular/core';
import {RegisteredService} from '../../services/registered.service';
import {PolicyBlock, PolicyFolder} from '../../structures';

type ValueType = string | PolicyBlock | null | undefined;

/**
 * SelectBlock.
 */
@Component({
    selector: 'select-block',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './select-block.component.html',
    styleUrls: ['./select-block.component.scss']
})
export class SelectBlock implements AfterViewInit {
    private searchTimeout!: any;
    private data?: any[];
    @Input('root') root!: PolicyFolder;
    @Input('blocks') blocks!: PolicyBlock[];
    @Input('readonly') readonly!: boolean;
    @Input('value') value: ValueType | ValueType[];
    @Input('type') type!: string;
    @Output('valueChange') valueChange = new EventEmitter<any>();
    @Output('change') change = new EventEmitter<any>();
    @Input() multiple: boolean = false;
    public text: string | null | undefined;
    public search: string = '';
    public searchData?: any[];

    constructor(private registeredService: RegisteredService) {
    }

    private sanitizeBlock(block: any): any {
        return {
            id: block.id,
            tag: block.tag,
            blockType: block.blockType,
            localTag: block.localTag,
            properties: block.properties
        };
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
        }
        if (value) {
            return value;
        } else {
            return '';
        }
    }

    private getIcon(value: PolicyBlock) {
        if (value === this.root) {
            if (this.root.isModule) {
                return {icon: 'policy-module', svg: true};
            } else if (this.root.isTool) {
                return {icon: 'handyman', svg: false};
            } else {
                return {icon: 'article', svg: false};
            }
        } else {
            return {
                icon: this.registeredService.getIcon(value.blockType),
                svg: false
            };
        }
    }

    private getFullText(): string {
        if (this.multiple) {
            if (this.value) {
                return (this.value as ValueType[])
                    .map((item: ValueType) => this.getText(item))
                    .join(', ')
            } else {
                return '';
            }
        } else {
            return this.getText(this.value as ValueType);
        }
    }

    ngAfterViewInit(): void {
        setTimeout(() => {
            this.onChange();
        }, 100)
    }

    onChange(value?: any) {
        this.text = this.getFullText();
        this.valueChange.emit(value ?? this.value);
        this.change.emit();
    }

    ngOnChanges(changes: SimpleChanges) {
        this.text = this.getFullText();

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
                        value: this.type === 'object' ? this.sanitizeBlock(block) : block.tag,
                        id: block.id,
                        original: block,
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

        if (this.searchData) {
            for (const item of this.searchData) {
                if (typeof item.value === 'object') {
                    item.id = item.value.id;
                } else {
                    item.id = item.value;
                }
            }
        }
    }

    get selectedOption(): any {
        if (!this.data) {
            return null;
        }

        if (this.type === 'object') {
            return this.data.find(item => item.value?.id === (this.value as PolicyBlock)?.id)?.value || null;
        } else {
            return this.data.find(item => item.value === this.value)?.value || null;
        }
    }

    set selectedOption(selected: any) {
        this.onChange(selected);
    }
}
