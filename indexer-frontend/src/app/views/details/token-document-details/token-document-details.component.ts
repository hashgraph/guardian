import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
    selector: 'token-document-details',
    templateUrl: './token-document-details.component.html',
    styleUrl: './token-document-details.component.scss',
    standalone: true,
    imports: [
        CommonModule,
        MatProgressSpinnerModule
    ]
})
export class TokenDocumentDetailsComponent {
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
