import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UserPermissions } from '@guardian/interfaces';
import { forkJoin, Subscription } from 'rxjs';
import { ProfileService } from 'src/app/services/profile.service';
import { MethodologiesService } from 'src/app/services/methodologies.service';
import { CustomConfirmDialogComponent } from '../../common/custom-confirm-dialog/custom-confirm-dialog.component';
import { DialogService } from 'primeng/dynamicdialog';
import { FormulaItemType, Formulas } from './formulas';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MathLiveComponent } from '../../common/mathlive/mathlive.component';

@Component({
    selector: 'app-methodology-configuration',
    templateUrl: './methodology-configuration.component.html',
    styleUrls: ['./methodology-configuration.component.scss'],
})
export class MethodologyConfigurationComponent implements OnInit {
    public readonly title: string = 'Configuration';

    @ViewChild('body', { static: true }) body: ElementRef;

    public loading: boolean = true;
    public isConfirmed: boolean = false;
    public user: UserPermissions = new UserPermissions();
    public owner: string;

    private subscription = new Subscription();
    private methodologyId: string;

    public item: any;
    public policy: any;
    public readonly: boolean = false;
    public keyboard: boolean = false;

    public items: Formulas = new Formulas();
    public readonly options = [
        {
            id: 'constant',
            text: 'Add New Constant',
            icon: 'add',
            color: 'icon-color-primary'
        },
        {
            id: 'variable',
            text: 'Add New Variable',
            icon: 'add',
            color: 'icon-color-primary'
        },
        {
            id: 'formula',
            text: 'Add New Formula',
            icon: 'add',
            color: 'icon-color-primary'
        },
        {
            id: 'text',
            text: 'Add New Text',
            icon: 'add',
            color: 'icon-color-primary'
        }
    ];

    public readonly filters = {
        constant: true,
        variable: true,
        formula: true,
        text: true
    }

    public stepper = [true, false];

    public overviewForm = new FormGroup({
        name: new FormControl<string>('', Validators.required),
        description: new FormControl<string>(''),
        policy: new FormControl<string>('', Validators.required),
    });

    constructor(
        private profileService: ProfileService,
        private methodologiesService: MethodologiesService,
        private dialogService: DialogService,
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
            this.overviewForm.setValue({
                name: item.name || '',
                description: item.description || '',
                policy: this.policy?.name || '',
            });
            this.items.fromData(item?.config);
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
        const config = this.items.getJson();
        const value = this.overviewForm.value;
        const item = {
            ...this.item,
            name: value.name,
            description: value.description,
            config
        };
        this.methodologiesService
            .updateMethodology(item)
            .subscribe((data) => {
                this.item = data;
                setTimeout(() => {
                    this.loading = false;
                }, 1000);
            }, (e) => {
                this.loading = false;
            });
    }

    public addItem(option: any) {
        const type: FormulaItemType = option.id;
        this.items.add(type);
    }

    public deleteItem(item: any) {
        const dialogRef = this.dialogService.open(CustomConfirmDialogComponent, {
            showHeader: false,
            width: '640px',
            styleClass: 'guardian-dialog',
            data: {
                header: 'Delete item',
                text: 'Are you sure want to delete item?',
                buttons: [{
                    name: 'Close',
                    class: 'secondary'
                }, {
                    name: 'Delete',
                    class: 'delete'
                }]
            },
        });
        dialogRef.onClose.subscribe((result: string) => {
            if (result === 'Delete') {
                this.items.delete(item);
            }
        });
    }

    public onFilter() {
        this.items.setFilters(this.filters);
    }

    public onStep(index: number) {
        this.loading = true;
        for (let i = 0; i < this.stepper.length; i++) {
            this.stepper[i] = false;
        }
        this.stepper[index] = true;
        this.loading = false;
        this.keyboard = false;
    }

    public isActionStep(index: number): boolean {
        return this.stepper[index];
    }

    public onKeyboard($event: boolean) {
        this.keyboard = $event;
    }

    public onKeyboardFocus($event: MathLiveComponent) {
        setTimeout(() => {
            if (this.keyboard) {
                const focus = $event.getElement();
                const scroll = this.body;
                const targetRect = focus.nativeElement.getBoundingClientRect();
                const scrollRect = scroll.nativeElement.getBoundingClientRect();
                const y = targetRect.y - scrollRect.y;
                const height = scrollRect.height;
                const d = y - height + 60;
                if (d > 0) {
                    scroll.nativeElement.scrollTop += d;
                }
            }
        });
    }
}