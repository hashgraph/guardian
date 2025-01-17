import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import {
    ActivatedRoute,
    NavigationEnd,
    Params,
    Router,
    RouterModule,
} from '@angular/router';
import {
    FormControl,
    FormsModule,
    ReactiveFormsModule,
} from '@angular/forms';
import { MenuItem } from 'primeng/api';
import { MenuModule } from 'primeng/menu';
import { BadgeModule } from 'primeng/badge';
import { RippleModule } from 'primeng/ripple';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';

@Component({
    selector: 'app-header',
    templateUrl: './header.component.html',
    styleUrl: './header.component.scss',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        TranslocoModule,
        ReactiveFormsModule,
        RouterModule,
        MenuModule,
        BadgeModule,
        RippleModule,
        IconFieldModule,
        InputIconModule,
        InputTextModule,
    ],
})
export class HeaderComponent {
    public loading: boolean = true;
    public searchControl = new FormControl<string>('');
    public small: boolean = false;
    public home: boolean = true;

    public accountsMenu: MenuItem[] = [
        {
            label: 'header.standard_registries',
            routerLink: '/registries',
        },
        {
            label: 'header.registry_users',
            routerLink: '/registry-users',
        },
    ];

    public methodologiesMenu: MenuItem[] = [
        {
            label: 'header.policies',
            routerLink: '/policies',
        },
        {
            label: 'header.tools',
            routerLink: '/tools',
        },
        {
            label: 'header.modules',
            routerLink: '/modules',
        },
        {
            label: 'header.schemas',
            routerLink: '/schemas',
        },
        {
            label: 'header.tokens',
            routerLink: '/tokens',
        },
        {
            label: 'header.roles',
            routerLink: '/roles',
        },
    ];

    public documentsMenu: MenuItem[] = [
        {
            label: 'header.dids',
            routerLink: '/did-documents',
        },
        {
            label: 'header.vcs',
            routerLink: '/vc-documents',
        },
        {
            label: 'header.vps',
            routerLink: '/vp-documents',
        },
    ];

    public othersMenu: MenuItem[] = [
        {
            label: 'header.nfts',
            routerLink: '/nfts',
        },
        {
            label: 'header.topics',
            routerLink: '/topics',
        },
        {
            label: 'header.contracts',
            routerLink: '/contracts',
        },
    ];

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private translocoService: TranslocoService
    ) {}

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
        });
    }

    public onSearch(): void {
        if (this.searchControl.valid && this.searchControl.value) {
            const queryParams: Params = { search: this.searchControl.value };
            this.router.navigate(['/search'], { queryParams });
        }
    }
}
