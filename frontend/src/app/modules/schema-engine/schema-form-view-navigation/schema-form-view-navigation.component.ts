import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';

export interface NavItem {
    title: string;
    accordionId: string;
    children?: NavItem[];
    count?: number;
}

@Component({
    selector: 'app-schema-form-view-navigation',
    templateUrl: './schema-form-view-navigation.component.html',
    styleUrls: ['./schema-form-view-navigation.component.scss'],
})
export class SchemaFormViewNavigationComponent implements OnInit, OnChanges {
    @Input() subjects: any[] | null = null;
    @Input() schemaMap: { [x: string]: any } | null = null;
    @Input() groupBaseTitle: string | null = null;
    @Input('private-fields') privateFields: { [x: string]: boolean } | null = null;

    @Output() selectEvent = new EventEmitter<string>();
    @Output() hasItemsChangeEvent = new EventEmitter<boolean>();

    public expanded = new Set<string>();

    public get navTree(): NavItem[] {
        const controls = this.getSourceControls();
        return this.buildNavTree(controls || []);
    }

    public getSourceControls(): any[] {
        if (!Array.isArray(this.subjects) || !this.schemaMap) return [];
        const result: any[] = [];
        for (let i = 0; i < this.subjects.length; i++) {
            const s = this.subjects[i];
            const type = s?.type || `subject-${i}`;
            const schema = this.schemaMap[type];
            const fields = schema?.fields ?? schema?.schemaFields ?? [];
            const title = this.groupBaseTitle
                ? (this.subjects.length > 1 ? `${this.groupBaseTitle} #${i + 1}` : this.groupBaseTitle)
                : (type ?? `Subject ${i + 1}`);
            result.push({ id: type, title, fields });
        }
        return result;
    }

    ngOnInit(): void {
        this.openFirstNavItem();
        this.hasItemsChangeEvent.emit(this.navTree.length > 0);
    }

    ngOnChanges(changes: SimpleChanges): void {
        if ((changes['subjects'] && !changes['subjects'].firstChange) || (changes['schemaMap'] && !changes['schemaMap'].firstChange)) {
            this.expanded.clear();
            this.openFirstNavItem();
        }

        this.hasItemsChangeEvent.emit(this.navTree.length > 0);
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

            const baseId = control.id || control.fullPath;
            const accordionId = parentPath ? `${parentPath};${baseId}` : baseId;
            const title = control.description ?? control.title ?? control.name;

            const node: NavItem = { title, accordionId };

            const childControls = Array.isArray(control.fields) ? control.fields : (Array.isArray(control.model?.controls) ? control.model.controls : undefined);
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
                        if (Array.isArray(control.fields) && control.fields.length > 0) {
                            instNode.children = this.buildNavTree(control.fields, instAccordionId);
                        }

                        if (Array.isArray(li.fields) && li.fields.length > 0) {
                            instNode.children = this.buildNavTree(li.fields, instAccordionId);
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
        if (!node || !node.accordionId) return;
        this.expandAncestors(node.accordionId);
        this.selectEvent.emit(node.accordionId);
    }

    private expandAncestors(accordionId: string) {
        const parts = accordionId.split(';');
        let cur = '';
        for (let i = 0; i < parts.length; i++) {
            cur = cur ? `${cur};${parts[i]}` : parts[i];
            this.expanded.add(cur);
        }
    }

    public expandedByAccordionId(accordionInfo: { path: string, isOpen: boolean }): void {
        if (accordionInfo && accordionInfo.path) {
            if (accordionInfo.isOpen) {
                this.expanded.add(accordionInfo.path);
            } else {
                this.expanded.delete(accordionInfo.path);
            }
        }
    }
}
