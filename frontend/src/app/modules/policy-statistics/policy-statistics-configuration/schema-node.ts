import { Schema } from "@guardian/interfaces";
import { TreeListView, TreeListData } from "../tree-graph/tree-list";
import { TreeNode } from "../tree-graph/tree-node";

export interface SchemaData {
    iri: string;
    name: string;
    description: string;
}

export class SchemaNode extends TreeNode<SchemaData> {
    public fields: TreeListView<any>;

    public override clone(): SchemaNode {
        const clone = new SchemaNode(this.id, this.type, this.data);
        clone.type = this.type;
        clone.data = this.data;
        clone.childIds = new Set(this.childIds);
        clone.fields = this.fields;
        return clone;
    }

    public override update() {
        this.fields = this.getRootFields();
    }

    public getRootFields(): TreeListView<any> {
        if (this.parent) {
            const parentFields = (this.parent as SchemaNode).getRootFields();
            return parentFields.createView((s) => {
                return s.parent?.data?.type === this.data.iri;
            });
        } else {
            return this.fields;
        }
    }

    public static from(schema: Schema): SchemaNode {
        const id = schema.iri;
        const type = schema.entity === 'VC' ? 'root' : 'sub';
        const data = {
            iri: schema.iri || '',
            name: schema.name || '',
            description: schema.description || '',
        };
        const result = new SchemaNode(id, type, data);
        const fields = TreeListData.fromObject<any>(schema, 'fields');
        result.fields = TreeListView.createView(fields, (s) => {
            return !s.parent;
        });
        result.fields.setSearchRules((item) => {
            return `(${item.description || ''})`.toLocaleLowerCase();
        })
        return result;
    }
}
