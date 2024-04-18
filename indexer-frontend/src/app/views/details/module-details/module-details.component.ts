import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
    selector: 'module-details',
    templateUrl: './module-details.component.html',
    styleUrl: './module-details.component.scss',
    standalone: true,
    imports: [
        CommonModule,
        MatProgressSpinnerModule
    ]
})
export class ModuleDetailsComponent {
    public loading: boolean = true;

    constructor(
        private route: ActivatedRoute,
        private router: Router
    ) {
    }

    ngOnInit() {
        this.loading = false;
        this.route.queryParams.subscribe(params => { });
    }

    ngOnDestroy(): void {

    }
}
