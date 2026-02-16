import { Component, EventEmitter, Input, Output, SimpleChanges } from '@angular/core';
import { IFieldControl } from '../schema-form-model/field-form';

export interface NavItem {
    title: string;
    accordionId: string;
    children?: NavItem[];
    count?: number;
}
@Component({
    selector: 'app-schema-form-navigation',
    templateUrl: './schema-form-navigation.component.html',
    styleUrls: ['./schema-form-navigation.component.scss'],
})
export class SchemaFormNavigationComponent {
    @Input() schemaFields: IFieldControl<any>[] | null;
    @Output() select = new EventEmitter<string>();

    public expanded = new Set<string>();

    public get navTree(): NavItem[] {
        return this.buildNavTree(this.schemaFields || []);
    }

    ngOnInit(): void {
        this.openFirstNavItem();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['schemaFields'] && !changes['schemaFields'].firstChange) {
            this.expanded.clear();
            this.openFirstNavItem();
        }
    }

    private openFirstNavItem() {
        setTimeout(() => {
            if (this.navTree && this.navTree.length > 0) {
                const firstItem = this.navTree[0];
                if (firstItem && firstItem.accordionId) {
                    this.toggle(firstItem.accordionId);
                }
            }
        }, 50);
    }

    public buildNavTree(controls: any[], parentPath?: string): NavItem[] {
        const items: NavItem[] = [];
        for (const control of controls || []) {
            if (control?.visibility === false) continue;

            if (!(control?.isRef || (control?.isArray && control?.isRef) || Array.isArray(control?.fields))) {
                continue;
            }

            const baseId = control.id;
            const accordionId = parentPath ? `${parentPath};${baseId}` : baseId;
            const title = control.description ?? control.title ?? control.name;

            const node: NavItem = { title, accordionId };

            const childControls = Array.isArray(control.model?.controls) ? control.model.controls : undefined;
            if (Array.isArray(childControls) && childControls.length > 0) {
                node.children = this.buildNavTree(childControls, accordionId);
            }

            if (control?.isArray) {
                const list = Array.isArray(control.list) ? control.list : [];
                if (list.length > 0) {
                    node.children = node.children || [];
                    for (let i = 0; i < list.length; i++) {
                        const li = list[i];
                        const idx = li?.index2 ?? i;
                        const instBase = `${baseId}-${idx}`;
                        const instAccordionId = parentPath ? `${parentPath};${instBase}` : instBase;
                        const instTitle = `${title} #${idx}`;
                        const instNode: NavItem = { title: instTitle, accordionId: instAccordionId };
                        if (Array.isArray(control.model?.controls) && control.model?.controls.length > 0) {
                            instNode.children = this.buildNavTree(control.model.controls, instAccordionId);
                        }

                        if (Array.isArray(li.model?.controls) && li.model?.controls.length > 0) {
                            instNode.children = this.buildNavTree(li.model.controls, instAccordionId);
                        }
                        instNode.count = instNode.children?.length || 0;
                        node.children.push(instNode);
                        node.count = node.children.length;
                    }
                }
            }
            node.count = node.children?.length;
            items.push(node);
        }
        return items;
    }

    public isExpanded(path: string): boolean {
        return this.expanded.has(path);
    }

    public toggle(path: string) {
        if (this.expanded.has(path)) {
            this.expanded.delete(path);
        } else {
            this.expanded.add(path);
        }
    }

    public onSelect(node: NavItem) {
        if (!node || !node.accordionId) 
            return;

        console.log('Selected node:', node);
        this.expandAncestors(node.accordionId);
        this.select.emit(node.accordionId);
    }

    private expandAncestors(accordionId: string) {
        const parts = accordionId.split(';');
        let cur = '';
        for (let i = 0; i < parts.length; i++) {
            cur = cur ? `${cur};${parts[i]}` : parts[i];
            this.expanded.add(cur);
        }
    }

    public expandedByAccordionId(accordionId: string): void {
        if (accordionId) {
            this.toggle(accordionId); 
        }
    }
}
