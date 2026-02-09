import { Component, Input, Output, EventEmitter } from '@angular/core';

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
    @Input() schemaFields: any[] | null;
    @Input() showCounts: boolean = true;

    public expanded = new Set<string>();

    public get navTree(): NavItem[] {
        return this.buildNavTree(this.schemaFields || []);
    }

    public get navItems(): NavItem[] {
        const tree = this.navTree;
        const res: NavItem[] = [];
        const walk = (nodes?: NavItem[]) => {
            if (!nodes) return;
            for (const n of nodes) {
                res.push({ title: n.title, path: n.path });
                walk(n.children);
            }
        };
        walk(tree);
        return res;
    }

    public buildNavTree(fields: any[], parentPath?: string): NavItem[] {
        const items: NavItem[] = [];
        for (const field of fields || []) {
            if (!(field?.isRef || (field?.isArray && field?.isRef))) {
                continue;
            }

            const name = field.name ?? field.title ?? field.fullPath ?? '';
            const basePath = parentPath ? `${parentPath}.${name}` : (field.path ?? field.fullPath ?? name);
            const title = field.description ?? field.title ?? field.name ?? basePath;

            const node: NavItem = { title, path: basePath, count: field.count ?? (Array.isArray(field.list) ? field.list.length : undefined) };

            // If field.fields exist, build nested nav items for them (recursive)
            if (Array.isArray(field.fields) && field.fields.length > 0) {
                // For nested fields we want to include only those that render as accordions
                node.children = this.buildNavTree(field.fields, basePath);
            }

            // If this is an array of sub-schemas and has instance list, create child nodes for each instance
            if (field?.isArray) {
                const list = Array.isArray(field.list) ? field.list : [];
                if (list.length > 0) {
                    node.children = node.children || [];
                    for (let i = 0; i < list.length; i++) {
                        const li = list[i];
                        const idx = li?.index2 ?? li?.index ?? i;
                        const instPath = `${basePath}.${idx}`;
                        const instTitle = `${title} #${idx + 1}`;
                        const instNode: NavItem = { title: instTitle, path: instPath };
                        // For each instance, include children from schema fields (if any)
                        if (Array.isArray(field.fields) && field.fields.length > 0) {
                            instNode.children = this.buildNavTree(field.fields, instPath);
                        }
                        node.children.push(instNode);
                    }
                }
            }

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

    public onSelect(path: string) {
    }
}
