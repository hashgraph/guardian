import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SearchService } from '../../services/search.service';
import { MatInputModule } from '@angular/material/input';
import { FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { ActivatedRoute, Router } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
    selector: 'app-search',
    templateUrl: './search.component.html',
    styleUrl: './search.component.scss',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        MatFormFieldModule,
        MatInputModule,
        ReactiveFormsModule,
        MatButtonModule,
        MatProgressSpinnerModule
    ]
})
export class SearchViewComponent {
    public loading: boolean = true;
    public searchControl = new FormControl<string>('', [Validators.required]);
    public results: { type: string, id: string }[] = [];

    constructor(
        private searchService: SearchService,
        private route: ActivatedRoute,
        private router: Router
    ) {
    }

    ngOnInit() {
        this.loading = false;
        this.route.queryParams.subscribe(params => {
            this.setSearch(params['search']);
        });
    }

    ngOnDestroy(): void {

    }

    public setSearch(search: string) {
        if (this.searchControl.value !== search) {
            this.searchControl.setValue(search);
            this.onSearch();
        }
    }

    public onSearch() {
        if (this.searchControl.valid && this.searchControl.value) {
            this.loading = true;
            this.searchService.search(this.searchControl.value).subscribe({
                next: (result) => {
                    const { results } = result;
                    this.results = results || [];
                    setTimeout(() => {
                        this.loading = false;
                    }, 500);
                },
                error: ({ message }) => {
                    this.loading = false;
                    console.error(message);
                }
            });
        } else {
            this.results = [];
        }
        this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { search: this.searchControl.value },
            queryParamsHandling: 'merge'
        });
    }

    public onOpen(item: any) {
        switch (item.type) {
            case 'topic': {
                this.router.navigate([`/topics/${item.id}`]);
                break;
            }
            case 'token': {
                this.router.navigate([`/tokens/${item.id}`]);
                break;
            }
            case 'message': {
                this.router.navigate([`/messages/${item.id}`]);
                break;
            }
            // Documents
            case 'EVC-Document':
            case 'VC-Document': {
                this.router.navigate([`/vc-documents/${item.id}`]);
                break;
            }
            case 'DID-Document': {
                this.router.navigate([`/did-documents/${item.id}`]);
                break;
            }
            case 'Schema':
            case 'schema-document': {
                this.router.navigate([`/schemas/${item.id}`]);
                break;
            }
            case 'Policy': {
                this.router.navigate([`/policies/${item.id}`]);
                break;
            }
            case 'Instance-Policy': {
                this.router.navigate([`/instance-policies/${item.id}`]);
                break;
            }
            case 'VP-Document': {
                this.router.navigate([`/vp-documents/${item.id}`]);
                break;
            }
            case 'Standard Registry': {
                this.router.navigate([`/standard-registries/${item.id}`]);
                break;
            }
            case 'Topic': {
                debugger;
                this.router.navigate([`/topic-documents/${item.id}`]);
                break;
            }
            case 'Token': {
                this.router.navigate([`/tokens/${item.id}`]);
                break;
            }
            case 'Module': {
                this.router.navigate([`/modules/${item.id}`]);
                break;
            }
            case 'Tool': {
                this.router.navigate([`/tools/${item.id}`]);
                break;
            }
            case 'Tag': {
                this.router.navigate([`/tags/${item.id}`]);
                break;
            }
            case 'Role-Document': {
                this.router.navigate([`/roles/${item.id}`]);
                break;
            }
            case 'Synchronization Event': {
                this.router.navigate([`/events/${item.id}`]);
                break;
            }
            case 'Contract': {
                this.router.navigate([`/contracts/${item.id}`]);
                break;
            }
            default: {
                debugger;
                this.router.navigate([`/messages/${item.id}`]);
                break;
            }
        }
    }
}
