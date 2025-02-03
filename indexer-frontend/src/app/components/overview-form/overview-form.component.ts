import { Component, Input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { HederaExplorer, HederaType } from '@components/hedera-explorer/hedera-explorer.component';
import { TranslocoModule } from '@jsverse/transloco';

export interface OverviewFormField {
    label: string,
    path: string,
    link?: string,
    direct?: boolean,
    queryParams?: any,
    value?: any,
    pattern?: any,
    filters?: Record<string, string>,
    hederaExplorerType?: HederaType,
    _link?: any,
}

@Component({
    selector: 'app-overview-form',
    standalone: true,
    imports: [TranslocoModule, RouterModule, HederaExplorer],
    templateUrl: './overview-form.component.html',
    styleUrl: './overview-form.component.scss'
})
export class OverviewFormComponent {
    @Input() target: any;
    @Input() fields!: OverviewFormField[];

    ngOnChanges() {
        if (Array.isArray(this.fields)) {
            for (const field of this.fields) {
                field.value = this.getFieldValue(this.target, field.path);
                field.queryParams = this.getQueryParamsFromFilters(field);
                field._link = this.getLink(field);
            }
        }
    }

    private getFieldValue(obj: any, paths: string) {
        const pathList = paths.split('.');
        let result = obj[pathList[0]];
        for (let i = 1; i < pathList.length; i++) {
            if (!result) {
                return result;
            }
            result = result[pathList[i]];
        }
        return result;
    }

    private getLink(field: OverviewFormField) {
        if (field.link) {
            if (field.direct || field.filters) {
                return [field.link];
            } else {
                if (field.pattern) {
                    const reg = new RegExp(field.pattern);
                    if (reg.test(field.value)) {
                        return [field.link, field.value];
                    } else {
                        return undefined;
                    }
                } else {
                    return [field.link, field.value];
                }
            }
        }
        return undefined;
    }

    private getQueryParamsFromFilters(field: OverviewFormField) {
        if (field.queryParams) {
            return field.queryParams;
        }

        if (field.filters) {
            const queryParams: any = {};
            for (const [key, path] of Object.entries(field.filters)) {
                const value = this.getFieldValue(this.target, path);
                if (value !== null && value !== undefined) {
                    queryParams[key] = value;
                }
            }
            return queryParams;
        }
        
        return undefined;
    }
}
