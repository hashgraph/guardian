import { Component, Input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslocoModule } from '@jsverse/transloco';

export interface OverviewFormField {
    label: string,
    path: string,
    link?: string,
    direct?: boolean,
    queryParams?: any
}

@Component({
  selector: 'app-overview-form',
  standalone: true,
  imports: [TranslocoModule, RouterModule],
  templateUrl: './overview-form.component.html',
  styleUrl: './overview-form.component.scss'
})
export class OverviewFormComponent {

    @Input() target: any;
    @Input() fields!: OverviewFormField[];

    getFieldValue(obj: any, paths: string) {
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
}
