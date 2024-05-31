import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { LoadingComponent } from '@components/loading/loading.component';
import { MatTabsModule } from '@angular/material/tabs';
import { ECElementEvent, EChartsOption } from 'echarts';
import { NgxEchartsDirective } from 'ngx-echarts';
import { MatInputModule } from '@angular/material/input';
import { BaseDetailsComponent } from '../base-details/base-details.component';
import { TranslocoModule } from '@jsverse/transloco';
import { EntitiesService } from '@services/entities.service';
import { TabViewModule } from 'primeng/tabview';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ButtonModule } from 'primeng/button';
import {
    OverviewFormComponent,
    OverviewFormField,
} from '@components/overview-form/overview-form.component';
import { TagModule } from 'primeng/tag';
import { ActivityComponent } from '@components/activity/activity.component';
import { InputTextareaModule } from 'primeng/inputtextarea';

export enum TokenType {
    FT = 'FUNGIBLE_COMMON',
    NFT = 'NON_FUNGIBLE_UNIQUE',
}

@Component({
    selector: 'app-topic-details',
    templateUrl: './token-details.component.html',
    styleUrls: [
        '../base-details/base-details.component.scss',
        './token-details.component.scss',
    ],
    standalone: true,
    imports: [
        CommonModule,
        LoadingComponent,
        MatTabsModule,
        NgxEchartsDirective,
        MatInputModule,
        TranslocoModule,
        TabViewModule,
        ProgressSpinnerModule,
        ButtonModule,
        OverviewFormComponent,
        ActivityComponent,
        TagModule,
        InputTextareaModule
    ],
})
export class TokenDetailsComponent extends BaseDetailsComponent {
    tabs: any[] = ['overview', 'raw'];
    overviewFields: OverviewFormField[] = [
        {
            label: 'details.token.overview.token_id',
            path: 'tokenId',
        },
        {
            label: 'details.token.overview.name',
            path: 'name',
        },
        {
            label: 'details.token.overview.symbol',
            path: 'symbol',
        },
        {
            label: 'details.token.overview.treasury',
            path: 'treasury',
        },
        {
            label: 'details.token.overview.type',
            path: 'type',
        },
    ];

    additionalOveriviewFormFields: OverviewFormField[] = [];

    constructor(
        private entitiesService: EntitiesService,
        route: ActivatedRoute,
        router: Router
    ) {
        super(route, router);
    }

    protected override loadData(): void {
        if (this.id) {
            this.loading = true;
            this.entitiesService.getToken(this.id).subscribe({
                next: (result) => {
                    this.setResult(result);
                    if (result.row['type'] === TokenType.NFT) {
                        this.additionalOveriviewFormFields = [
                            {
                                label: 'details.token.overview.serial_number',
                                path: 'serialNumber',
                                link: `/nfts`,
                                direct: true,
                                queryParams: {
                                    tokenId: result.row['tokenId']
                                }
                            }
                        ];
                    } else {
                        this.additionalOveriviewFormFields = [
                            {
                                label: 'details.token.overview.total_supply',
                                path: 'totalSupply',
                            },
                        ];
                    }
                    setTimeout(() => {
                        this.loading = false;
                    }, 500);
                },
                error: ({ message }) => {
                    this.loading = false;
                    console.error(message);
                },
            });
        } else {
            this.setResult();
        }
    }

    protected override onNavigate(): void {}

    protected override getTabIndex(name: string): number {
        if (this.target) {
            const tabIndex = this.tabs.findIndex((item) => item === name);
            return tabIndex >= 0 ? tabIndex : 0;
        } else {
            return 0;
        }
    }

    protected override getTabName(index: number): string {
        return this.tabs[index] || 'raw';
    }

    public onSelect(event: ECElementEvent) {
        if (event.dataType === 'node') {
            this.toEntity(String(event.value), event.name, 'relationships');
        }
    }

    public getJson(item: any): string {
        return JSON.stringify(item, null, 4);
    }

    public getDocument(item: any): string {
        return JSON.stringify(JSON.parse(item), null, 4);
    }

    public override onOpenTopics() {
        this.router.navigate(['/topics'], {
            queryParams: {
                'options.parentId': this.id,
            },
        });
    }
}
