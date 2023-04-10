import { Component, EventEmitter, Inject, Input, Output, SimpleChanges } from '@angular/core';
import { RegisteredService } from '../../registered-service/registered.service';
import { PolicyBlockModel } from '../../structures';

/**
 * SelectBlock.
 */
@Component({
    selector: 'select-block',
    templateUrl: './select-block.component.html',
    styleUrls: ['./select-block.component.css']
})
export class SelectBlock {
    @Input('root') root!: any;
    @Input('blocks') blocks!: PolicyBlockModel[];
    @Input('readonly') readonly!: boolean;
    @Input('value') value: string | PolicyBlockModel | null | undefined;
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
        if (this.value && typeof this.value === 'object') {
            this.text = this.value === this.root ? 'Module' : this.value.localTag;
        } else {
            this.text = this.value;
        }
        this.valueChange.emit(this.value);
        this.change.emit();
    }

    ngOnChanges(changes: SimpleChanges) {
        if (this.value && typeof this.value === 'object') {
            this.text = this.value === this.root ? 'Module' : this.value.localTag;
        } else {
            this.text = this.value;
        }
        setTimeout(() => {
            this.data = [];
            if (this.blocks) {
                for (const block of this.blocks) {
                    const search = (block.tag || '').toLocaleLowerCase();
                    const root = block === this.root;
                    this.data.push({
                        name: root ? 'Module' : block.localTag,
                        value: this.type === 'object' ? block : block.tag,
                        icon: this.registeredService.getIcon(block.blockType),
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
    }
}