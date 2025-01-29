import { Component, Input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CheckboxButton } from '@components/checkbox-button/checkbox-button.component';
import { MathLiveComponent } from '@components/math-live/math-live.component';
import { TranslocoModule } from '@jsverse/transloco';
import { Formulas } from '../../models/formulas';

@Component({
    selector: 'app-formula-view',
    standalone: true,
    imports: [
        TranslocoModule, 
        RouterModule,
        CheckboxButton,
        MathLiveComponent
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

    ngOnChanges() {
        this.config.fromData(this.data?.config);
    }

    public onFilter() {
        this.config.setFilters(this.filters);
    }

    public getEntityName(link: any): string {
        return link.entityId;

        if (link.type === 'schema') {
            return this.schemasMap.get(link.entityId) || '';
        }
        if (link.type === 'formula') {
            return this.formulasMap.get(link.entityId) || '';
        }
        return '';
    }

    public getFieldName(link: any): string {
        return link.item;

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
        return relationship;
    }
}
