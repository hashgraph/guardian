import { Component, Input } from '@angular/core';
import { MeterGroupModule, MeterItem } from 'primeng/metergroup';
import { CardModule } from 'primeng/card';
import { TranslocoModule } from '@jsverse/transloco';

export enum Activity {
    Registries = 'registries',
    Topics = 'topics',
    Policies = 'policies',
    Tools = 'tools',
    Modules = 'modules',
    Schemas = 'schemas',
    SchemaPackages = 'schemaPackages',
    Tokens = 'tokens',
    Roles = 'roles',
    DIDs = 'dids',
    VCs = 'vcs',
    VPs = 'vps',
    Contracts = 'contracts',
    Users = 'users',
    Formulas = 'formulas',
}

@Component({
    selector: 'app-activity',
    standalone: true,
    imports: [CardModule, MeterGroupModule, TranslocoModule],
    templateUrl: './activity.component.html',
    styleUrl: './activity.component.scss',
})
export class ActivityComponent {
    activityColors: Map<Activity, string> = new Map([
        [Activity.Registries, '#1f77b4'],
        [Activity.Users, '#1f77b4'],
        [Activity.Topics, '#ff7f0e'],
        [Activity.Policies, '#2ca02c'],
        [Activity.Tools, '#d62728'],
        [Activity.Modules, '#9467bd'],
        [Activity.Schemas, '#8c564b'],
        [Activity.SchemaPackages, '#8c564b'],
        [Activity.Tokens, '#e377c2'],
        [Activity.Roles, '#7f7f7f'],
        [Activity.DIDs, '#bcbd22'],
        [Activity.VCs, '#17becf'],
        [Activity.VPs, '#ffbb78'],
        [Activity.Contracts, '#98df8a'],
        [Activity.Formulas, '#98df8a'],
    ]);
    activityIcons: Map<Activity, string> = new Map([
        [Activity.Registries, 'pi pi-database'],
        [Activity.Users, 'pi pi-users'],
        [Activity.Topics, 'pi pi-comments'],
        [Activity.Policies, 'pi pi-shield'],
        [Activity.Tools, 'pi pi-wrench'],
        [Activity.Modules, 'pi pi-objects-column'],
        [Activity.Schemas, 'pi pi-sitemap'],
        [Activity.SchemaPackages, 'pi pi-sitemap'],
        [Activity.Tokens, 'pi pi-tag'],
        [Activity.Roles, 'pi pi-users'],
        [Activity.DIDs, 'pi pi-id-card'],
        [Activity.VCs, 'pi pi-file'],
        [Activity.VPs, 'pi pi-file'],
        [Activity.Contracts, 'pi pi-pencil'],
        [Activity.Formulas, 'pi pi-file'],
    ]);

    @Input() activity!: MeterItem[];
    @Input() total!: number;
    @Input() label!: string;
}
