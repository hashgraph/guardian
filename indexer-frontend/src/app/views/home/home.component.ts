import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatInputModule } from '@angular/material/input';
import { FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { Params, Router } from '@angular/router';
import { TranslocoModule } from '@jsverse/transloco';

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
        TranslocoModule
    ]
})
export class HomeComponent {
    public loading: boolean = true;
    public searchControl = new FormControl<string>('', [Validators.required]);
    public results: { type: string, id: string }[] = [];

    constructor(
        private router: Router
    ) {
    }

    ngOnInit() {
        this.loading = false;
    }

    ngOnDestroy(): void {

    }

    public onSearch() {
        if (this.searchControl.valid && this.searchControl.value) {
            const queryParams: Params = { search: this.searchControl.value };
            this.router.navigate(['/search'], { queryParams });
        }
    }
}
