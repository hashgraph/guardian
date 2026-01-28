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
import { HederaType } from '@components/hedera-explorer/hedera-explorer.component';
import { DialogService } from 'primeng/dynamicdialog';

export enum TopicType {
    UserTopic = 'USER_TOPIC',
    PolicyTopic = 'POLICY_TOPIC',
    InstancePolicyTopic = 'INSTANCE_POLICY_TOPIC',
    DynamicTopic = 'DYNAMIC_TOPIC',
    SchemaTopic = 'SCHEMA_TOPIC',
    SynchronizationTopic = 'SYNCHRONIZATION_TOPIC',
    RetireTopic = 'RETIRE_TOPIC',
    TokenTopic = 'TOKEN_TOPIC',
    ModuleTopic = 'MODULE_TOPIC',
    ContractTopic = 'CONTRACT_TOPIC',
    ToolTopic = 'TOOL_TOPIC',
    TagsTopic = 'TAGS_TOPIC',
}

@Component({
    selector: 'app-topic-details',
    templateUrl: './topic-details.component.html',
    styleUrls: [
        '../base-details/base-details.component.scss',
        './topic-details.component.scss',
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
        TagModule
    ],
})
export class TopicDetailsComponent extends BaseDetailsComponent {

    topicNames: any = {
        [TopicType.UserTopic]: 'User Topic',
        [TopicType.PolicyTopic]: 'Policy Topic',
        [TopicType.InstancePolicyTopic]: 'Instance Policy Topic',
        [TopicType.DynamicTopic]: 'Dynamic Topic',
        [TopicType.SchemaTopic]: 'Schema Topic',
        [TopicType.SynchronizationTopic]: 'Synchronization Topic',
        [TopicType.RetireTopic]: 'Retire Topic',
        [TopicType.TokenTopic]: 'Token Topic',
        [TopicType.ModuleTopic]: 'Module Topic',
        [TopicType.ContractTopic]: 'Contract Topic',
        [TopicType.ToolTopic]: 'Tool Topic',
        [TopicType.TagsTopic]: 'Tags Topic',
    };

    tabs: any[] = ['overview', 'activity', 'raw'];
    overviewFields: OverviewFormField[] = [
        {
            label: 'details.topic.overview.topic_id',
            path: 'topicId',
            hederaExplorerType: HederaType.TOPIC,
        },
        {
            label: 'details.topic.overview.name',
            path: 'options.name',
        },
        {
            label: 'details.topic.overview.description',
            path: 'options.description',
        },
        {
            label: 'details.topic.overview.parent_id',
            path: 'options.parentId',
            link: '/topics',
        },
    ];

    // activityItems: MeterItem[] = [];
    // totalActivity: number = 0;

    constructor(
        entitiesService: EntitiesService,
        dialogService: DialogService,
        route: ActivatedRoute,
        router: Router
    ) {
        super(entitiesService, dialogService, route, router);
    }

    protected override loadData(): void {
        if (this.id) {
            this.loading = true;
            this.entitiesService.getTopic(this.id).subscribe({
                next: (result) => {
                    this.setResult(result);

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

    protected override onNavigate(): void {
    }

    protected override getTabIndex(name: string): number {
        if (this.target) {
            const tabIndex = this.tabs.findIndex((item) => item === name);
            return tabIndex >= 0 ? tabIndex : 0;
        } else {
            return 0;
        }
    }

    protected override getTabName(index: number): string {
        if (this.target) {
            return this.tabs[index] || 'raw';
        } else {
            return 'raw';
        }
    }

    public onSelect(event: ECElementEvent) {
        if (event.dataType === 'node') {
            this.toEntity(String(event.value), event.name, 'relationships');
        }
    }

    public getJson(item: any): string {
        return JSON.stringify(item, null, 4);
    }

    public override onOpenTopics() {
        this.router.navigate(['/topics'], {
            queryParams: {
                'options.parentId': this.id,
            },
        });
    }

    public override onOpenRegistries() {
        this.router.navigate(['/registries'], {
            queryParams: {
                'topicId': this.id,
            },
        });
    }

    public override onOpenPolicies() {
        this.router.navigate(['/policies'], {
            queryParams: {
                'topicId': this.id,
            },
        });
    }

    public override onOpenTools() {
        this.router.navigate(['/tools'], {
            queryParams: {
                'topicId': this.id,
            },
        });
    }

    public override onOpenModules() {
        this.router.navigate(['/modules'], {
            queryParams: {
                'topicId': this.id,
            },
        });
    }

    public override onOpenSchemas() {
        this.router.navigate(['/schemas'], {
            queryParams: {
                'topicId': this.id,
            },
        });
    }

    public override onOpenTokens() {
        this.router.navigate(['/tokens'], {
            queryParams: {
                'topicId': this.id,
            },
        });
    }

    public override onOpenRoles() {
        this.router.navigate(['/roles'], {
            queryParams: {
                'topicId': this.id,
            },
        });
    }

    public override onOpenDIDs() {
        this.router.navigate(['/did-documents'], {
            queryParams: {
                'topicId': this.id,
            },
        });
    }

    public override onOpenVCs() {
        this.router.navigate(['/vc-documents'], {
            queryParams: {
                'topicId': this.id,
            },
        });
    }

    public override onOpenVPs() {
        this.router.navigate(['/vp-documents'], {
            queryParams: {
                'topicId': this.id,
            },
        });
    }

    public override onOpenContracts() {
        this.router.navigate(['/contracts'], {
            queryParams: {
                'topicId': this.id,
            },
        });
    }
}
