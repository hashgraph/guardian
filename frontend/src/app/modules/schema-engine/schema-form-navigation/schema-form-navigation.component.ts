import { Component, Input } from '@angular/core';
import { IFieldControl } from '../schema-form-model/field-form';

export interface NavItem {
    title: string;
    path: string;
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

    public buildNavTree(controls: any[], parentPath?: string): NavItem[] {
        const items: NavItem[] = [];
        for (const control of controls || []) {
            if (control?.visibility === false) continue;

            if (!(control?.isRef || (control?.isArray && control?.isRef) || Array.isArray(control?.fields))) {
                continue;
            }

            const name = control.name ?? control.title ?? control.path ?? control.fullPath ?? '';
            
            const rawPath = control.path ?? control.fullPath ?? name;
            const basePath = parentPath && rawPath && !rawPath.includes('.') ? `${parentPath}.${rawPath}` : (rawPath || name);
            const title = control.description ?? control.title ?? control.name ?? basePath;

            const node: NavItem = { title, path: basePath};

            const childControls = Array.isArray(control.model?.controls) ? control.model.controls : undefined;
            if (Array.isArray(childControls) && childControls.length > 0) {
                node.children = this.buildNavTree(childControls, basePath);
            }

            if (control?.isArray) {
                const list = Array.isArray(control.list) ? control.list : [];
                if (list.length > 0) {
                    node.children = node.children || [];
                    for (let i = 0; i < list.length; i++) {
                        const li = list[i];
                        const idx = li?.index2 ?? li?.index ?? i;
                        const instPath = `${basePath}.${idx}`;
                        const instTitle = `${title} #${idx}`;
                        const instNode: NavItem = { title: instTitle, path: instPath };
                        if (Array.isArray(control.model?.controls) && control.model?.controls.length > 0) {
                            instNode.children = this.buildNavTree(control.model.controls, instPath);
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
