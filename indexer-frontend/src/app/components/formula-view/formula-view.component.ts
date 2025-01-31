import { Component, Input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CheckboxButton } from '@components/checkbox-button/checkbox-button.component';
import { MathLiveComponent } from '@components/math-live/math-live.component';
import { TranslocoModule } from '@jsverse/transloco';
import { Formulas } from '../../models/formulas';
import { Schema } from '@indexer/interfaces';
import { TabViewModule } from 'primeng/tabview';

@Component({
    selector: 'app-formula-view',
    standalone: true,
    imports: [
        TranslocoModule,
        RouterModule,
        CheckboxButton,
        MathLiveComponent,
        TabViewModule
    ],
    templateUrl: './formula-view.component.html',
    styleUrl: './formula-view.component.scss'
})
export class FormulaViewComponent {
    @Input() data: any;

    public readonly filters = {
        constant: true,
        variable: true,
        formula: true,
        text: true
    }

    public config: Formulas = new Formulas();

    private schemasMap: Map<string, string> = new Map<string, string>();
    private schemasFieldMap: Map<string, string> = new Map<string, string>();
    private formulasMap: Map<string, string> = new Map<string, string>();
    private formulasFieldMap: Map<string, string> = new Map<string, string>();
    private variableMap: Map<string, string> = new Map<string, string>();

    public isDocument: boolean = false;

    ngOnChanges() {
        const item = this.data.item;
        const schemas = this.data.schemas;
        const formulas = this.data.formulas;

        this.isDocument = false;
        if (!(item && item.analytics && item.analytics.config)) {
            return;
        }
        this.isDocument = true;

        if (item?.analytics?.config) {
            this.config.fromData(item.analytics.config.config);
        }
        if (schemas) {
            this.schemasMap.clear();
            this.schemasFieldMap.clear();
            for (const message of schemas) {
                const schema = this.getSchemaDocument(message);
                if (schema) {
                    this.schemasMap.set(String(schema.iri), String(schema.name));
                    const fields = schema.getFields();
                    for (const field of fields) {
                        this.schemasFieldMap.set(`${schema.iri}.${field.path}`, String(field.description));
                    }
                }
            }
        }
        if (formulas) {
            for (const message of formulas) {
                const formula = this.getFormulaDocument(message);
                if (formula) {
                    this.formulasMap.set(String(formula.uuid), String(formula.name));
                    const fields = formula?.config?.formulas || [];
                    for (const field of fields) {
                        this.formulasFieldMap.set(`${formula.uuid}.${field.uuid}`, String(field.name));
                    }
                }
            }
        }
        this.variableMap.clear();
        for (const v of this.config.all) {
            this.variableMap.set(v.uuid, v.name);
        }
    }

    public getSchemaDocument(message: any) {
        try {
            const schema = new Schema(message.documents[0], '');
            return schema;
        } catch (error) {
            return null;
        }
    }

    public getFormulaDocument(message: any) {
        try {
            return message?.analytics?.config;
        } catch (error) {
            return null;
        }
    }

    public onFilter() {
        this.config.setFilters(this.filters);
    }

    public getEntityName(link: any): string {
        if (link.type === 'schema') {
            return this.schemasMap.get(link.entityId) || '';
        }
        if (link.type === 'formula') {
            return this.formulasMap.get(link.entityId) || '';
        }
        return '';
    }

    public getFieldName(link: any): string {
        if (link.type === 'schema') {
            return this.schemasFieldMap.get(`${link.entityId}.${link.item}`) || '';
        }
        if (link.type === 'formula') {
            if (link.entityId === this.data?.uuid) {
                return this.config.getItem(link.item)?.name || '';
            } else {
                return this.formulasFieldMap.get(`${link.entityId}.${link.item}`) || '';
            }
        }
        return '';
    }

    public getRelationshipName(relationship: any) {
        return this.variableMap.get(relationship);
    }
}
