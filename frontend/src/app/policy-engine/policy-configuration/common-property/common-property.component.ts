import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges, ViewEncapsulation } from '@angular/core';
import { Schema } from '@guardian/interfaces';
import { RegisteredBlocks } from '../../registered-blocks';
import { PolicyModel } from '../../structures/policy-model';

/**
 * common property
 */
@Component({
    selector: '[common-property]',
    templateUrl: './common-property.component.html',
    styleUrls: ['./common-property.component.css'],
    encapsulation: ViewEncapsulation.None
})
export class CommonPropertyComponent implements OnInit {
    @Input('policy') policy!: PolicyModel;
    @Input('property') property!: any;
    @Input('collapse') collapse!: any;
    @Input('readonly') readonly!: boolean;
    @Input('data') data!: any;
    @Input('offset') offset!: number;
    @Input('schemas') schemas!: Schema[];

    @Output('update') update = new EventEmitter();

    get value(): any {
        return this.data[this.property.name];
    }

    set value(v: any) {
        this.data[this.property.name] = v;
    }

    get group(): any {
        if (this.property.name) {
            return this.data[this.property.name];
        } else {
            return this.data;
        }
    }

    groupCollapse: boolean = false;
    itemCollapse: any = {};
    needUpdate: boolean = true;

    allBlocks: any[] = [];
    childrenBlocks: any[] = [];
    loaded: boolean = false;

    constructor(public registeredBlocks: RegisteredBlocks) {

    }

    ngOnInit(): void {
        this.needUpdate = true;
    }

    getIcon(block: any) {
        return this.registeredBlocks.getIcon(block.blockType);
    }

    ngOnChanges(changes: SimpleChanges) {
        if (this.property) {
            if (this.property.type === 'Group') {
                if (typeof this.data[this.property.name] !== 'object') {
                    this.data[this.property.name] = {};
                }
            } else if (this.property.type === 'Array') {
                if (!Array.isArray(this.data[this.property.name])) {
                    this.data[this.property.name] = [];
                }
            } else if (this.property.type === 'Select' || this.property.type === 'MultipleSelect') {
                if (this.policy?.allBlocks) {
                    this.allBlocks = this.policy.allBlocks.map(item => {
                        return {
                            name: item.tag,
                            icon: this.getIcon(item),
                            value: item.tag,
                            parent: item?.parent?.id
                        }
                    });
                } else {
                    this.allBlocks = [];
                }
                this.childrenBlocks = this.allBlocks.filter(item => item.parent === this.data?.id);
            } else {
                if (this.property.default && !this.data.hasOwnProperty(this.property.name)) {
                    this.data[this.property.name] = this.property.default;
                }
            }
        }
        setTimeout(() => {
            this.loaded = true;
        }, 0);
    }

    customPropCollapse(property: any) {
        return this.collapse;
    }

    onSave() {
        this.needUpdate = true;
        this.update.emit();
    }

    onHide() {
        this.groupCollapse = !this.groupCollapse;
    }

    onHideItem(i: any) {
        this.itemCollapse[i] = !this.itemCollapse[i];
    }

    addItems() {
        this.needUpdate = true;
        const item: any = {};
        for (const p of this.property.items.properties) {
            if (p.default) {
                item[p.name] = p.default;
            }
        }
        this.value.push(item);
        this.update.emit();
    }

    removeItems(i: number) {
        this.needUpdate = true;
        this.value.splice(i, 1);
        this.update.emit();
    }

    getArrayItemText(config: any, item: any): string {
        if (this.needUpdate) {
            let text = config.value;
            if (text && text.indexOf('@') !== -1) {
                for (const prop of config.properties) {
                    text = text.replaceAll('@' + prop.name, item[prop.name] || '');
                }
            }
            config.__value = text;
        }
        return config.__value;
    }
}
