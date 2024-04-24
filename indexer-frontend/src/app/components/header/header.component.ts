import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { MatMenuModule } from '@angular/material/menu';
import { MatInputModule } from '@angular/material/input';
import { ActivatedRoute, NavigationEnd, Params, Router, RouterModule } from '@angular/router';
import { FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
    selector: 'app-header',
    templateUrl: './header.component.html',
    styleUrl: './header.component.scss',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        MatButtonModule,
        TranslocoModule,
        MatMenuModule,
        MatInputModule,
        ReactiveFormsModule,
        RouterModule,
    ]
})
export class HeaderComponent {
    public loading: boolean = true;
    public searchControl = new FormControl<string>('', [Validators.required]);
    public small: boolean = false;
    public home: boolean = true;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private translocoService: TranslocoService
    ) {
    }

    ngOnInit() {
        this.translocoService.events$.subscribe((v) => {
            setTimeout(() => {
                this.loading = false;
            }, 600);
        });
        setTimeout(() => {
            this.loading = false;
        }, 1000);

        this.home = this.router.url === '/';
        this.router.events.subscribe((event) => {
            if (event instanceof NavigationEnd) {
                this.home = event.url === '/';
            }
        })
    }

    public onSearch(): void {
        if (this.searchControl.valid && this.searchControl.value) {
            const queryParams: Params = { search: this.searchControl.value };
            this.router.navigate(['/search'], { queryParams });
        }
    }
}
