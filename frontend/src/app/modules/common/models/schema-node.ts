import { Schema } from "@guardian/interfaces";
import { TreeListView, TreeListData } from "../tree-graph/tree-list";
import { TreeNode } from "../tree-graph/tree-node";

export interface SchemaData {
    iri: string;
    name: string;
    description: string;
}

export interface FieldData {
    name: string;
    type: string;
    description: string;
    property: string;
    propertyName: string;
    isArray: boolean;
    isRef: boolean;
    path: string;
}

export class SchemaNode extends TreeNode<SchemaData> {
    public fields: TreeListView<FieldData>;

    public override clone(): SchemaNode {
        const clone = new SchemaNode(this.id, this.type, this.data);
        clone.type = this.type;
        clone.data = this.data;
        clone.childIds = new Set(this.childIds);
        clone.fields = this.fields;
        return clone;
    }

    public override update() {
        if (this.parent) {
            const root = this.getRoot() as SchemaNode;
            const parentFields = root.fields;
            this.fields = parentFields.createView((s) => {
                return s.parent?.data?.type === this.data.iri;
            });
        }
        this.fields.setSelectedLimit(4);
        this.fields.updateSearch();
    }

    public static from(schema: Schema, properties: Map<string, string>): SchemaNode {
        const id = schema.iri;
        const type = (schema.entity === 'VC' || schema.category === 'SYSTEM') ? 'root' : 'sub';
        const data = {
            iri: schema.iri || '',
            name: schema.name || '',
            description: schema.description || ''
        };
        const result = new SchemaNode(id, type, data);
        const fields = TreeListData.fromObject<FieldData>(schema, 'fields', (f) => {
            if (f.data.property) {
                f.data.propertyName = properties.get(f.data.property) || f.data.property;
            }
            return f;
        });
        result.fields = TreeListView.createView(fields, (s) => {
            return !s.parent;
        });
        result.fields.setSearchRules((item) => {
            return [
                `(${item.description || ''})|(${item.propertyName || ''})`.toLocaleLowerCase(),
                `(${item.description || ''})`.toLocaleLowerCase(),
                `(${item.propertyName || ''})`.toLocaleLowerCase()
            ];
        })
        return result;
    }
}

export class DocumentNode extends TreeNode<any> {
    public override clone(): DocumentNode {
        const clone = new DocumentNode(this.id, this.type, this.data);
        clone.type = this.type;
        clone.data = this.data;
        clone.entity = this.entity;
        clone.childIds = new Set(this.childIds);
        return clone;
    }

    public override update() {
    }

    public static from(document: any, type: 'root' | 'sub'): DocumentNode {
        const id = document.messageId;
        const result = new DocumentNode(id, type, document);
        return result;
    }
}