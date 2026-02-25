import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges, ViewEncapsulation, } from '@angular/core';
import { PolicyEditableFieldDTO } from '@guardian/interfaces';
import { DialogService } from 'primeng/dynamicdialog';
import { CodeEditorDialogComponent } from 'src/app/modules/policy-engine/dialogs/code-editor-dialog/code-editor-dialog.component';
import { RegisteredService } from 'src/app/modules/policy-engine/services/registered.service';
import { PolicyBlock } from 'src/app/modules/policy-engine/structures';

/**
 * policy parameter property
 */

@Component({
    selector: '[policy-parameter-property]',
    templateUrl: './policy-parameter-property.component.html',
    styleUrls: ['./policy-parameter-property.component.scss'],
    encapsulation: ViewEncapsulation.None,
})
export class PolicyParameterPropertyComponent implements OnInit {
    @Input('block') currentBlock?: PolicyBlock;
    @Input('property') property!: any;
    @Input('collapse') collapse!: any;
    @Input('readonly') readonly!: boolean;
    @Input('config') config: PolicyEditableFieldDTO;
    @Input('offset') offset!: number;
    @Output('update') update = new EventEmitter();

    rootPath: string;
    pathValue: string;

    get value(): any {
        return this.config.value;
    }

    set value(v: any) {
        this.config.value = v;
    }

    pathOptions = [
        { label: 'Root', value: '', title: ' ' },
        { label: 'Document', value: 'document.', title: 'document.' },
        { label: 'Credential Subjects', value: 'document.credentialSubject.', title: 'document.credentialSubject.' },
        { label: 'First Credential Subjects', value: 'document.credentialSubject.0.', title: 'document.credentialSubject.0.' },
        { label: 'Last Credential Subjects', value: 'document.credentialSubject.L.', title: 'document.credentialSubject.L.' },
        { label: 'Verifiable Credentials', value: 'document.verifiableCredential.', title: 'document.verifiableCredential.' },
        { label: 'First Verifiable Credential', value: 'document.verifiableCredential.0.', title: 'document.verifiableCredential.0.' },
        { label: 'Last Verifiable Credential', value: 'document.verifiableCredential.L.', title: 'document.verifiableCredential.L.' },
        { label: 'Attributes', value: 'option.', title: 'option.' }
    ];

    groupCollapse: boolean = false;
    itemCollapse: any = {};
    needUpdate: boolean = true;

    allBlocks: any[] = [];
    childrenBlocks: any[] = [];
    loaded: boolean = false;

    constructor(
        private registeredService: RegisteredService,
        private dialog: DialogService,
    ) {
    }

    ngOnInit(): void {
        this.needUpdate = true;
    }

    ngOnChanges(changes: SimpleChanges) {
        if(this.currentBlock) {
            this.load(this.currentBlock);
            setTimeout(() => {
                this.loaded = true;
            }, 0);
        }
    }
    
    onPathPropertyChanged() {
        this.value = this.rootPath + this.pathValue;
        this.onSave();
    }

    load(block: PolicyBlock) {
        const moduleVariables = block.moduleVariables;
        if (this.property) {
            if (this.property.type === 'Array') {
                if (!Array.isArray(this.config.value)) {
                    this.config.value = [];
                }
            } else if (this.property.type === 'Path') {
                if (this.value) {
                    for (const item of this.pathOptions) {
                        if (this.value.startsWith(item.value)) {
                            this.rootPath = item.value;
                            this.pathValue = this.value.substring(item.value.length);
                        }
                    }
                } else {
                    this.rootPath = '';
                    this.pathValue = '';
                }
            } 
            else if (
                this.property.type === 'Select' ||
                this.property.type === 'MultipleSelect'
            ) {
                this.allBlocks = [];
                if (moduleVariables?.module?.allBlocks) {
                    this.allBlocks = moduleVariables.module.allBlocks.map(
                        (item) => {
                            return {
                                name: item.localTag,
                                icon: this.registeredService.getIcon(
                                    item.blockType
                                ),
                                value: item.tag,
                                parent: item?.parent?.id,
                            };
                        }
                    );
                }
                // this.childrenBlocks = this.allBlocks.filter(
                //     (item) => item.parent === this.data?.id
                // );
                // this.schemas = moduleVariables?.schemas || [];
                // this.roles =
                //     moduleVariables?.roles?.filter(
                //         (item: any) =>
                //             !['OWNER', 'NO_ROLE', 'ANY_ROLE'].includes(
                //                 item.value
                //             )
                //     ) || [];
            } 
            // else if (this.property.type === 'Schemas') {
            //     this.schemas = moduleVariables?.schemas || [];
            // }
            // if (
            //     this.property.type !== 'Group' &&
            //     this.property.type !== 'Array'
            // ) {
            //     if (
            //         (this.property.default !== undefined) &&
            //         (!this.data.hasOwnProperty(this.property.name))
            //     ) {
            //         this.data[this.property.name] = this.property.default;
            //     }
            // }
        }
    }

    customPropCollapse(property: any) {
        return this.collapse;
    }

    onSave() {
        this.needUpdate = true;
        this.update.emit();
    }

    editCode($event: MouseEvent) {
        const dialogRef = this.dialog.open(CodeEditorDialogComponent, {
            showHeader: false,
            width: '90%',
            styleClass: 'guardian-dialog',
            data: {
                test: false,
                expression: this.value,
                readonly: this.readonly
            }
        })
        dialogRef.onClose.subscribe(result => {
            if (result) {
                this.value = result.expression;
                if (result.type === 'save') {
                    this.needUpdate = true;
                    this.update.emit();
                }
            }
        })
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
                    text = text.replaceAll(
                        '@' + prop.name,
                        item[prop.name] || ''
                    );
                }
            }
            config.__value = text;
        }
        return config.__value;
    }

    visible(expression: string) {
        return true;
        // return (
        //     !expression ||
        //     new Function(...Object.keys(this.config), 'return ' + expression)(
        //         ...Object.values(this.config)
        //     )
        // );
    }

    getSelectedItemsDisplay(selectedItems: any[]): string {
        if (!selectedItems || selectedItems.length === 0) {
            return 'No blocks selected';
        }
        return selectedItems.map(selected => selected.name).join(', ');
    }
}
