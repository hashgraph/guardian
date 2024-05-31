import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatInputModule } from '@angular/material/input';
import {
    FormControl,
    FormsModule,
    ReactiveFormsModule,
    Validators,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { Params, Router } from '@angular/router';
import { TranslocoModule } from '@jsverse/transloco';
import { StatCardComponent } from '@components/stat-card/stat-card.component';
import { ProjectLocationsComponent } from '@components/project-locations/project-locations.component';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { LandingService } from '@services/landing.service';

@Component({
    selector: 'app-home',
    templateUrl: './home.component.html',
    styleUrl: './home.component.scss',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        MatFormFieldModule,
        MatInputModule,
        ReactiveFormsModule,
        MatButtonModule,
        TranslocoModule,
        StatCardComponent,
        ProjectLocationsComponent,
        InputTextModule,
        IconFieldModule,
        InputIconModule,
    ],
})
export class HomeComponent {
    public loading: boolean = true;
    public searchControl = new FormControl<string>('');

    public stats: any = [];
    public projectLocations: any[] = [];

    constructor(
        private router: Router,
        private landingService: LandingService
    ) {}

    ngOnInit() {
        this.landingService.getAnalytics().subscribe((result) => {
            if (result.length < 1) {
                return;
            }
            const labels = result.map(
                (item: { date: string | number | Date }) =>
                    new Date(item.date).toLocaleString()
            );
            const hasUpcount = result.length > 1;
            this.stats.push({
                label: 'stat.registries',
                labels,
                data: result.map(
                    (item: { registries: any }) => item.registries
                ),
                count: result[result.length - 1].registries,
                upcount: hasUpcount
                    ? result[result.length - 1].registries -
                      result[result.length - 2].registries
                    : 0,
                link: '/registries',
            });
            this.stats.push({
                label: 'stat.methodologies',
                labels,
                data: result.map(
                    (item: { methodologies: any }) => item.methodologies
                ),
                count: result[result.length - 1].methodologies,
                upcount: hasUpcount
                    ? result[result.length - 1].methodologies -
                      result[result.length - 2].methodologies
                    : 0,
                link: '/policies',
            });
            this.stats.push({
                label: 'stat.projects',
                labels,
                data: result.map((item: { projects: any }) => item.projects),
                count: result[result.length - 1].projects,
                upcount: hasUpcount
                    ? result[result.length - 1].projects -
                      result[result.length - 2].projects
                    : 0,
                link: '/vc-documents',
            });
            this.stats.push({
                label: 'stat.total_issuance',
                labels,
                data: result.map(
                    (item: { totalIssuance: any }) => item.totalIssuance
                ),
                count: result[result.length - 1].totalIssuance,
                upcount: hasUpcount
                    ? result[result.length - 1].totalIssuance -
                      result[result.length - 2].totalIssuance
                    : 0,
                link: '/tokens',
            });
        });
        this.landingService
            .getProjectsCoordinates()
            .subscribe((result) => (this.projectLocations = result));
    }

    ngOnDestroy(): void {}

    public onSearch() {
        if (this.searchControl.valid && this.searchControl.value) {
            const queryParams: Params = { search: this.searchControl.value };
            this.router.navigate(['/search'], { queryParams });
        }
    }
}
