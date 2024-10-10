import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from 'src/app/services/auth.service';
import { HeaderPropsService } from 'src/app/services/header-props.service';
import { TagsService } from 'src/app/services/tag.service';
import { IUser } from '@guardian/interfaces';
import { ProfileService } from '../../services/profile.service';

/**
 * The page with guided policy search
 */
@Component({
    selector: 'app-policy-searchh',
    templateUrl: './policy-search.component.html',
    styleUrls: ['./policy-search.component.scss']
})
export class PolicySearchComponent implements OnInit {
    loading: boolean = false;
    selectedIndex: number = 0;
    isConfirmed: boolean = false;

    private subscription = new Subscription();
    private tabs = ['policy-ai-search', 'policy-guided-search'];

    constructor(
        public tagsService: TagsService,
        private auth: AuthService,
        private route: ActivatedRoute,
        private router: Router,
        public dialog: MatDialog,
        private headerProps: HeaderPropsService,
        private profileService: ProfileService,
    ) {
    }

    ngOnInit() {
        this.loadProfile();
        this.route.queryParams.subscribe((params) => {
            const tab = this.route.snapshot.queryParams['tab'] || '';
            this.selectedIndex = 0;
            for (let index = 0; index < this.tabs.length; index++) {
                if (tab === this.tabs[index]) {
                    this.selectedIndex = index;
                }
            }
        })
    }

    loadProfile() {
        this.loading = true;
        this.profileService.getProfile().subscribe(
            (value) => {
                const profile: IUser | null = value;
                this.isConfirmed = (profile && profile.confirmed)!;
            },
            (error) => {
                console.error(error);
            }, () => {
                this.loading = false;
            }
        );
    }

    ngOnDestroy(): void {
    }

    onChange(event: any) {
        this.selectedIndex = event;
        this.router.navigate(['/policy-search'], {
            queryParams: {tab: this.tabs[this.selectedIndex]}
        });
        if (this.selectedIndex === 0) {
        } else if (this.selectedIndex === 1) {
        } else if (this.selectedIndex === 2) {
        } else {
            setTimeout(() => {
                this.loading = false;
                this.headerProps.setLoading(false);
            }, 200);
        }
    }
}
