import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { LoadingComponent } from '@components/loading/loading.component';
import { MatTabsModule } from '@angular/material/tabs';
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
import { ActivityComponent } from '@components/activity/activity.component';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { OrganizationChartModule } from 'primeng/organizationchart';
import CID from 'cids';

@Component({
    selector: 'schema-details',
    templateUrl: './schema-details.component.html',
    styleUrls: [
        '../base-details/base-details.component.scss',
        './schema-details.component.scss',
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
        InputTextareaModule,
        OrganizationChartModule,
    ],
})
export class SchemaDetailsComponent extends BaseDetailsComponent {
    public title!: string;
    public itemNumber?: string;

    tabs: any[] = ['overview', 'document', 'tree', 'activity', 'raw'];
    overviewFields: OverviewFormField[] = [
        {
            label: 'details.schema.overview.topic_id',
            path: 'topicId',
            link: '/topics',
        },
        {
            label: 'details.schema.overview.owner',
            path: 'options.owner',
        },
        {
            label: 'details.schema.overview.name',
            path: 'options.name',
        },
        {
            label: 'details.schema.overview.description',
            path: 'options.description',
        },
        {
            label: 'details.schema.overview.version',
            path: 'options.version',
        },
        {
            label: 'details.schema.overview.policy',
            path: 'analytics.policyIds',
            link: '/policies',
        },
    ];
    tree?: any;

    constructor(
        entitiesService: EntitiesService,
        route: ActivatedRoute,
        router: Router
    ) {
        super(entitiesService, route, router);
    }

    protected override loadData(): void {
        if (this.id) {
            const items = this.id.split('_');
            if (items.length > 1) {
                this.title = items[0];
                this.itemNumber = items[1];
            } else {
                this.title = items[0];
                this.itemNumber = '';
            }

            this.loading = true;
            this.entitiesService.getSchema(this.id).subscribe({
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
            this.title = this.id;
            this.setResult();
        }
    }

    protected override onNavigate(): void {
        if (this.id && this.tab === 'tree') {
            this.loading = true;
            this.entitiesService.getSchemaTree(this.id).subscribe({
                next: (result) => {
                    this.tree = result;
                },
                complete: () => (this.loading = false),
            });
        }
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

    openSchema(id: string) {
        this.tree = null;
        this.router.navigate(['schemas', id]);
    }

    protected override onOpenVCs(): void {
        this.router.navigate(['/vc-documents'], {
            queryParams: {
                'analytics.schemaId': this.id,
            },
        });
    }

    protected override onOpenVPs(): void {
        this.router.navigate(['/vp-documents'], {
            queryParams: {
                'analytics.schemaIds': this.id,
            },
        });
    }

    protected override setFiles(item: any) {
        if (item) {
            if (Array.isArray(item.files)) {
                item._ipfs = [];
                item._ipfsStatus = true;
                for (let i = 0; i < item.files.length; i++) {
                    const fullUrl = item.files[i];
                    const { url, uuid } = this.parsUrl(fullUrl);

                    const document = item.documents?.[i];
                    const json = this.getDocument(document);
                    const documentObject = this.getDocumentObject(document);
                    const credentialSubject = this.getCredentialSubject(documentObject);
                    const verifiableCredential = this.getVerifiableCredential(documentObject);
                    const cid = new CID(url);
                    const ipfs = {
                        version: cid.version,
                        cid: url,
                        uuid: uuid,
                        global: cid.toV1().toString('base32'),
                        document,
                        json,
                        documentObject,
                        credentialSubject,
                        verifiableCredential
                    }
                    if (!document) {
                        item._ipfsStatus = false;
                    }
                    item._ipfs.push(ipfs);
                }
            }
        }
    }

    private parsUrl(url: string) {
        if (url && url.indexOf('#')) {
            const items = url.split('#');
            return {
                url: items[0],
                uuid: items[1],
            }
        } else {
            return {
                url,
                uuid: null,
            }
        }
    }
}
