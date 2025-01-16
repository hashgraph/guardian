import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { GenerateUUIDv4, UserPermissions } from '@guardian/interfaces';
import { forkJoin, Subscription } from 'rxjs';
import { ProfileService } from 'src/app/services/profile.service';
import { MethodologiesService } from 'src/app/services/methodologies.service';

enum FormulaItemType {
    Constant = 'constant',
    Variable = 'variable',
    Formula = 'formula',
    Text = 'text'
}

interface FormulaItem {
    uuid: string;
    name: string;
    description: string;
    type: FormulaItemType,
    value?: any;
    link?: any;
    relationships?: any;
}

@Component({
    selector: 'app-methodology-configuration',
    templateUrl: './methodology-configuration.component.html',
    styleUrls: ['./methodology-configuration.component.scss'],
})
export class MethodologyConfigurationComponent implements OnInit {
    public readonly title: string = 'Configuration';

    public loading: boolean = true;
    public isConfirmed: boolean = false;
    public user: UserPermissions = new UserPermissions();
    public owner: string;

    private subscription = new Subscription();
    private methodologyId: string;

    public item: any;
    public policy: any;
    public readonly: boolean = false;

    public items: FormulaItem[] = [];

    constructor(
        private profileService: ProfileService,
        private methodologiesService: MethodologiesService,
        private router: Router,
        private route: ActivatedRoute
    ) {
    }

    ngOnInit() {
        this.subscription.add(
            this.route.queryParams.subscribe((queryParams) => {
                this.loadProfile();
            })
        );
    }

    ngOnDestroy(): void {
        this.subscription.unsubscribe();
    }

    private loadProfile() {
        this.isConfirmed = false;
        this.loading = true;
        this.profileService
            .getProfile()
            .subscribe((profile) => {
                this.isConfirmed = !!(profile && profile.confirmed);
                this.user = new UserPermissions(profile);
                this.owner = this.user.did;

                if (this.isConfirmed) {
                    this.loadData();
                } else {
                    setTimeout(() => {
                        this.loading = false;
                    }, 500);
                }
            }, (e) => {
                this.loading = false;
            });
    }

    private loadData() {
        this.methodologyId = this.route.snapshot.params['methodologyId'];
        this.loading = true;
        forkJoin([
            this.methodologiesService.getMethodology(this.methodologyId),
        ]).subscribe(([item]) => {
            this.item = item;
            setTimeout(() => {
                this.loading = false;
            }, 1000);
        }, (e) => {
            this.loading = false;
        });
    }

    public onBack() {
        this.router.navigate(['/methodologies']);
    }

    public onSave() {
        this.loading = true;
        this.methodologiesService
            .updateMethodology({})
            .subscribe((item) => {
                this.item = item;
                setTimeout(() => {
                    this.loading = false;
                }, 1000);
            }, (e) => {
                this.loading = false;
            });
    }

    public addItem(type: string) {
        if (type === FormulaItemType.Constant) {
            this.items.push({
                uuid: GenerateUUIDv4(),
                name: '',
                description: '',
                type: type,
                value: ''
            })
        } else if (type === FormulaItemType.Variable) {
            this.items.push({
                uuid: GenerateUUIDv4(),
                name: '',
                description: '',
                type: type,
                value: '',
                link: null
            })
        } else if (type === FormulaItemType.Formula) {
            this.items.push({
                uuid: GenerateUUIDv4(),
                name: '',
                description: '',
                type: type,
                value: '',
                link: null,
                relationships: []
            })
        } else if (type === FormulaItemType.Text) {
            this.items.push({
                uuid: GenerateUUIDv4(),
                name: '',
                description: '',
                type: type,
                value: '',
                link: null,
                relationships: []
            })
        } else {
            return;
        }
    }
}