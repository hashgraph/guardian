import { Component, Input } from '@angular/core';
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

    public expanded = new Set<string>();

    public get navTree(): NavItem[] {
        return this.buildNavTree(this.schemaFields || []);
    }

    public buildNavTree(controls: any[]): NavItem[] {
        const items: NavItem[] = [];
        for (const control of controls || []) {
            if (control?.visibility === false) continue;

            if (!(control?.isRef || (control?.isArray && control?.isRef) || Array.isArray(control?.fields))) {
                continue;
            }

            const accordionId = control.id;
            const title = control.description ?? control.title ?? control.name;

            const node: NavItem = { title, accordionId};

            const childControls = Array.isArray(control.model?.controls) ? control.model.controls : undefined;
            if (Array.isArray(childControls) && childControls.length > 0) {
                node.children = this.buildNavTree(childControls);
            }

            if (control?.isArray) {
                const list = Array.isArray(control.list) ? control.list : [];
                if (list.length > 0) {
                    node.children = node.children || [];
                    for (let i = 0; i < list.length; i++) {
                        const li = list[i];
                        const idx = li?.index2 ?? i;
                        const instAccordionId = `${accordionId}.${idx}`;
                        const instTitle = `${title} #${idx}`;
                        const instNode: NavItem = { title: instTitle, accordionId: instAccordionId };
                        if (Array.isArray(control.model?.controls) && control.model?.controls.length > 0) {
                            instNode.children = this.buildNavTree(control.model.controls);
                        }
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
        console.log('Selected node:', node);
    }
}
