import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { LoadingComponent } from '@components/loading/loading.component';
import { CommentsComponent } from '@components/comments/comments.component';
import { MatTabsModule } from '@angular/material/tabs';
import { EChartsOption } from 'echarts';
import { NgxEchartsDirective } from 'ngx-echarts';
import { MatInputModule } from '@angular/material/input';
import { BaseDetailsComponent } from '../base-details/base-details.component';
import { TranslocoModule } from '@jsverse/transloco';
import { createChart } from '../base-details/relationships-chart.config';
import { EntitiesService } from '@services/entities.service';
import { TabViewModule } from 'primeng/tabview';
import { ColumnType, TableComponent } from '@components/table/table.component';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SchemaFormViewComponent } from '@components/schema-form-view/schema-form-view.component';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { Schema } from '@indexer/interfaces';
import { SelectButtonModule } from 'primeng/selectbutton';
import { FormsModule } from '@angular/forms';
import { OverviewFormComponent, OverviewFormField } from '@components/overview-form/overview-form.component';
import { ButtonModule } from 'primeng/button';
import { FormulasTree } from '../../../models/formula-tree';
import { ProjectLocationsComponent } from '@components/project-locations/project-locations.component';
import { bytesToUtf8, decryptWithKeyDerivedFromString } from '@meeco/cryppo';
import { DialogService } from 'primeng/dynamicdialog';
import { VCFullscreenDialog } from '../../../dialogs/vc-fullscreen-dialog/vc-fullscreen-dialog.component';
import { InputTextModule } from 'primeng/inputtext';
import { InputIconModule } from 'primeng/inputicon';
import { IconFieldModule } from 'primeng/iconfield';

@Component({
    selector: 'vc-document-details',
    templateUrl: './vc-document-details.component.html',
    styleUrls: [
        '../base-details/base-details.component.scss',
        './vc-document-details.component.scss',
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
        TableComponent,
        ProgressSpinnerModule,
        SchemaFormViewComponent,
        InputTextareaModule,
        SelectButtonModule,
        FormsModule,
        OverviewFormComponent,
        ButtonModule,
        ProjectLocationsComponent,
        CommentsComponent,
        IconFieldModule,
        InputIconModule,
        InputTextModule,
        VCFullscreenDialog
    ],
    providers: [DialogService],
})
export class VcDocumentDetailsComponent extends BaseDetailsComponent {
    public chartOption: EChartsOption = createChart();

    public discussions: any[] = [];
    public discussionsCount: number = 0;
    public commentsCount: number = 0;
    public discussionsKey: Map<string, string> = new Map<string, string>();
    public decryptedDiscussions: any[] = [];

    overviewFields: OverviewFormField[] = [
        {
            label: 'details.vc.overview.topic_id',
            path: 'topicId',
            link: '/topics',
        },
        {
            label: 'details.vc.overview.issuer',
            path: 'options.issuer',
        },
        {
            label: 'details.vc.overview.policy',
            path: 'analytics.policyId',
            link: '/policies',
        },
        {
            label: 'details.hedera.action',
            path: 'action',
        },
        {
            label: 'details.hedera.status',
            path: 'status',
        },
    ];
    tabs: any[] = ['overview', 'document', 'comments', 'history', 'relationships', 'raw'];
    historyColumns: any[] = [
        {
            title: 'details.hedera.consensus_timestamp',
            field: 'consensusTimestamp',
            type: ColumnType.TEXT,
            width: '250px',
        },
        {
            title: 'details.hedera.topic_id',
            field: 'topicId',
            type: ColumnType.TEXT,
            width: '100px',
        },
        {
            title: 'details.hedera.action',
            field: 'action',
            type: ColumnType.TEXT,
            width: '200px',
        },
        {
            title: 'details.hedera.status',
            field: 'status',
            type: ColumnType.TEXT,
            width: '100px',
        },
        {
            title: 'details.hedera.status_reason',
            field: 'statusReason',
            type: ColumnType.TEXT,
            width: '100px',
        },
    ];
    discussionsColumns: any[] = [
        {
            type: ColumnType.TEXT,
            field: 'consensusTimestamp',
            title: 'grid.date',
            width: '250px',
            minWidth: '250px',
            maxWidth: '250px',
            formatValue: (value: any) => {
                const fixedTimestamp = Math.floor(value * 1000);
                value = new Date(fixedTimestamp);
                const formattedDate = value.toLocaleString();
                return formattedDate;
            }
        },
        {
            title: 'details.hedera.consensus_timestamp',
            field: 'consensusTimestamp',
            type: ColumnType.TEXT,
            width: '250px',
            minWidth: '250px',
            maxWidth: '250px',
        },
        {
            type: ColumnType.TEXT,
            field: 'topicId',
            title: 'details.hedera.topic_id',
            width: '150px',
            minWidth: '150px',
            maxWidth: '150px',
            link: {
                field: 'topicId',
                url: '/topics',
            },
        },
        {
            title: 'details.hedera.name',
            field: '_name',
            type: ColumnType.TEXT,
            width: 'calc(100vw - 1130px)',
        },
        {
            title: 'details.hedera.comments',
            field: '_comments',
            type: ColumnType.TEXT,
            width: '150px',
            minWidth: '150px',
            maxWidth: '150px',
        },
        // {
        //     title: 'details.hedera.status',
        //     field: '_status',
        //     type: ColumnType.CHIP,
        //     width: '150px',
        //     minWidth: '150px',
        //     maxWidth: '150px',
        //     severity: (row: any) => {
        //         return row._status === 'decrypted' ? 'success' : 'secondary';
        //     }
        // },
        {
            type: ColumnType.BUTTON,
            title: 'grid.open',
            btn_label: 'grid.open',
            width: '100px',
            minWidth: '100px',
            maxWidth: '100px',
            disabled: (row: any) => {
                return row._status !== 'decrypted';
            },
            callback: this.onOpenComments.bind(this),
        },
    ];
    documentViewOptions = [
        {
            icon: 'pi pi-code',
            value: 'json',
        },
        {
            icon: 'pi pi-file',
            value: 'document',
        },
    ];
    documentViewOption = 'document';

    privateFields = {
        '@context': true,
        'type': true,
        'policyId': true,
        'ref': true
    };
    formulas?: FormulasTree | null;
    formulasResults?: any | null;
    analytics: any | null

    mapTabs: any[] = ['json', 'table'];
    mapTabIndex: number = 0;
    mapPoints: any[] = [];

    geoShapes: any = [];
    geoJsonShapes: any = [];
    geoShapesColumns: any[] = [
        {
            type: ColumnType.TEXT,
            field: 'type',
            title: 'grid.type',
            width: '80px',
        },
        {
            type: ColumnType.TEXT,
            field: 'coordinates',
            title: 'grid.coordinates',
            width: '196px',
            formatValue: (value: any) => {
                return value[0] + ' ' + value[1];
            }
        },
        {
            type: ColumnType.BUTTON,
            callback: this.openMap.bind(this),
            icon: 'pi pi-map-marker',
            width: '48px',
        },
    ];
    discussionsSearch: string = '';

    constructor(
        entitiesService: EntitiesService,
        private dialogService: DialogService,
        route: ActivatedRoute,
        router: Router
    ) {
        super(entitiesService, route, router);
        console.log(1)
    }

    protected override setResult(result?: any) {
        super.setResult(result);

        try {
            if (result?.schema) {
                this.schema = new Schema(result?.schema, '');
                this.documentViewOption = 'document';
                this.analytics = result?.item?.analytics

                if (result?.item?.documents?.length >= 0) {
                    this.mapPoints = [];
                    const geoFieldPaths: string[] = this.getGeoFields(this.schema);
                    geoFieldPaths.forEach(path => {
                        result.item.documents.forEach((document: string) => {
                            const vc = this.getCredentialSubject(JSON.parse(document));
                            const locations = this.getValue(vc, path);
                            if (locations) {
                                this.geoShapes.push(locations);
                                this.geoJsonShapes.push(this.formatGeoJsonForMap(locations));
                                if (Array.isArray(locations)) {
                                    for (const item of locations) {
                                        this.createMapPoints(item);
                                    }
                                } else {
                                    this.createMapPoints(locations);
                                }
                            }
                        });
                    });
                }
            } else {
                this.documentViewOption = 'json';
            }
        } catch (error) {
            console.log(error);
        }
        try {
            if (result?.formulasData) {
                this.formulas = FormulasTree.from(result.formulasData);
                this.formulasResults = this.formulas?.getFields(this.schema?.iri);
            }
        } catch (error) {
            console.log(error);
        }
    }

    protected override setFiles(result?: any) {
        super.setFiles(result);
        try {
            if (result?.schema) {
                this.schema = new Schema(result?.schema, '');
                this.documentViewOption = 'document';
            } else {
                this.documentViewOption = 'json';
            }
        } catch (error) {
            console.log(error);
        }
    }

    protected override loadData(): void {
        if (this.id) {
            this.loading = true;
            this.entitiesService.getVcDocument(this.id).subscribe({
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
        if (this.id && this.tab === 'relationships') {
            this.loading = true;
            this.entitiesService
                .getVcRelationships(this.id)
                .subscribe({
                    next: (result) => {
                        this.setRelationships(result);
                        this.setChartData();
                        setTimeout(() => {
                            this.loading = false;
                        }, 500);
                    },
                    error: ({ message }) => {
                        this.loading = false;
                        console.error(message);
                    },
                });
        }
        if (this.id && this.tab === 'comments') {
            this.loading = true;
            this.entitiesService
                .getVcDiscussions(this.id)
                .subscribe({
                    next: (result) => {
                        this.discussions = result || [];
                        this.updateDiscussions().then(() => {
                            setTimeout(() => {
                                this.loading = false;
                            }, 500);
                        });
                    },
                    error: ({ message }) => {
                        this.loading = false;
                        console.error(message);
                    },
                });
        }
    }

    private async updateDiscussions() {
        this.discussionsCount = this.discussions.length;
        this.commentsCount = 0;
        for (const discussion of this.discussions) {
            if (discussion.options?.comments) {
                this.commentsCount += discussion.options?.comments;
                discussion._comments = discussion.options?.comments;
            } else {
                discussion._comments = 0;
            }
            discussion._status = 'encrypted';
            await this.decryptDiscussions(discussion);
        }
        this.decryptedDiscussions = [];
        for (const discussion of this.discussions) {
            if (discussion._status === 'decrypted') {
                this.decryptedDiscussions.push(discussion);
            }
        }
    }

    private async decryptDiscussions(discussion: any) {
        if (discussion._status !== 'decrypted') {
            const key = this.discussionsKey.get(discussion.consensusTimestamp);
            if (key) {
                discussion._status = 'decrypting';
                try {
                    const encryptedData = discussion.documents[0];
                    const decryptedData = await this.decryptData(key, encryptedData);
                    if (decryptedData) {
                        discussion._document = decryptedData;
                        const subject = this.getCredentialSubject(discussion._document);
                        discussion._name = subject?.name;
                        discussion._status = 'decrypted';
                    } else {
                        discussion._status = 'encrypted';
                    }
                } catch (error) {
                    discussion._status = 'encrypted';
                }
            }
        }
    }

    public onDecryptDiscussion() {
        this.openFile((files) => {
            this.loading = true;
            for (const file of files) {
                if (file.text) {
                    this.addKey(file.text);
                }
            }
            this.updateDiscussions().then(() => {
                setTimeout(() => {
                    this.loading = false;
                }, 500);
            });
        })
    }

    public onDiscussionsSearch() {
        const search = (this.discussionsSearch || '').toLowerCase();
        this.decryptedDiscussions = [];
        for (const discussion of this.discussions) {
            if (discussion._status === 'decrypted') {
                this.decryptedDiscussions.push(discussion);
            }
        }
        if (search) {
            this.decryptedDiscussions = this.decryptedDiscussions.filter((d) => {
                const name = (d._name || '').toLowerCase();
                return name.includes(search);
            })
        }
    }

    private openFile(callback: (files: any[]) => void) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.key';
        input.onchange = (event) => {
            const files: any[] = [];
            if (input.files) {
                for (let i = 0; i < input.files.length; i++) {
                    const file = input.files[i];
                    files.push({
                        loaded: false,
                        text: null,
                        error: null,
                        file
                    });
                }
            }
            const complete = () => {
                for (const file of files) {
                    if (!file.loaded) {
                        return;
                    }
                }
                callback(files);
            }
            for (const file of files) {
                const reader = new FileReader();
                reader.readAsText(file.file, "UTF-8");
                reader.onload = (evt) => {
                    file.text = evt.target?.result;
                    file.loaded = true;
                    complete();
                }
                reader.onerror = function (evt) {
                    file.error = "error reading file";
                    file.loaded = true;
                    complete();
                }
            }
            input.remove();
        }
        input.oncancel = (event) => {
            callback([]);
            input.remove();
        }
        input.click();
    }

    private addKey(text: string) {
        try {
            const config = JSON.parse(text);
            if (Array.isArray(config)) {
                for (const item of config) {
                    if (item && item.discussion && item.key) {
                        this.discussionsKey.set(item.discussion, item.key);
                    }
                }
            } else if (config) {
                if (config.discussion && config.key) {
                    this.discussionsKey.set(config.discussion, config.key);
                }
            }
        } catch (error) {
            console.error('Load key:', error);
        }
    }

    private onOpenComments(discussion: any) {
        const dialogRef = this.dialogService.open(VCFullscreenDialog, {
            showHeader: false,
            width: '950px',
            styleClass: 'guardian-dialog',
            maskStyleClass: 'guardian-fullscreen-dialog',
            data: {
                title: this.schema?.name,
                schema: this.schema,
                credentialSubject: this.getDocumentSubject(),
                formulasResults: this.formulasResults,
                targetId: this.id,
                discussionId: discussion.consensusTimestamp,
                discussion: discussion,
                key: this.discussionsKey.get(discussion.consensusTimestamp)
            },
        });
        dialogRef.onClose.subscribe((result: any) => { });
    }

    private getDocumentSubject() {
        if (this.first && this.first._ipfs && this.first._ipfs[0]) {
            return this.first._ipfs[0].credentialSubject;
        }
        return null;
    }

    async decryptData(key: string, encryptedData: string): Promise<string | null> {
        try {
            if (!encryptedData?.startsWith('Aes256')) {
                return null;
            }
            const decrypted: any = await decryptWithKeyDerivedFromString({
                serialized: encryptedData,
                passphrase: key,
            });
            const decryptedData = bytesToUtf8(decrypted);
            return JSON.parse(decryptedData);
        } catch (error) {
            console.error('Decryption failed:', error);
            return null;
        }
    }

    protected override getTabIndex(name: string): number {
        if (this.target) {
            const tabIndex = this.tabs.findIndex(item => item === name)
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

    private setChartData() {
        this.chartOption = createChart(this.relationships);
    }

    public onSelect(event: any) {
        if (event.dataType === 'node') {
            this.toEntity(
                String(event.data?.entityType),
                event.name,
                'relationships'
            );
        }
    }

    public removeContextField(obj: any, fieldToRemove: string): any {
        if (Array.isArray(obj)) {
            return obj.map(item => this.removeContextField(item, fieldToRemove));
        } else if (typeof obj === 'object' && obj !== null) {
            const newObj: any = {};
            for (const key in obj) {
                if (key !== fieldToRemove) {
                    newObj[key] = this.removeContextField(obj[key], fieldToRemove);
                }
            }
            return newObj;
        }
        return obj;
    }

    public formatGeoJsonForMap(json: any): string {
        const formattedJson = this.removeContextField(json, '@context');
        const jsonString = JSON.stringify(formattedJson, null, 2);
        return jsonString.replace(
            /(-?\d+(\.\d+)?)/g,
            '<span>$1</span>'
        );
    }

    public getJson(item: any): string {
        return JSON.stringify(item, null, 4);
    }

    public getGeoFields(obj: any): string[] {
        const fieldNames: string[] = [];

        const findGeoField = (fieldObject: any, path: string) => {
            if (fieldObject.fields && fieldObject.fields.length > 0) {
                fieldObject.fields.forEach((field: any) => {
                    const newPath = path == '' ? field.name : path + '.' + field.name;
                    if (field?.context?.type === 'GeoJSON') {
                        fieldNames.push(newPath);
                    }
                    if (field.fields && field.fields.length > 0) {
                        findGeoField(field, newPath);
                    }
                });
            }
        }

        findGeoField(obj, '');

        return fieldNames;
    }

    public getValue(obj: any, path: string): any {
        return path.split('.').reduce((acc, key) => acc?.[key], obj);
    }

    public openMap(item: any) {
        const url = `https://www.google.com/maps/place/${item.coordinates[1]},${item.coordinates[0]}`;
        window.open(url, '_blank');
    }

    private createMapPoints(
        item: { type: string; coordinates: any[] },
    ) {
        switch (item.type) {
            case 'Point': {
                this.mapPoints.push({
                    coordinates: item.coordinates,
                    type: item.type,
                });
                break;
            }
            case 'MultiPoint':
            case 'LineString': {
                let coordinatesCount = item.coordinates.length;
                const sumCoordinates: number[] = [0, 0];
                for (const point of item.coordinates) {
                    sumCoordinates[0] += point[0];
                    sumCoordinates[1] += point[1];
                }
                const centerCoordinate: number[] = [sumCoordinates[0] / coordinatesCount, sumCoordinates[1] / coordinatesCount];
                this.mapPoints.push({
                    coordinates: centerCoordinate,
                    type: item.type,
                })
                break;
            }
            case 'Polygon':
            case 'MultiLineString': {
                let coordinatesCount = 0;
                const sumCoordinates: number[] = [0, 0];
                for (const multiPoint of item.coordinates) {
                    for (const point of multiPoint) {
                        sumCoordinates[0] += point[0];
                        sumCoordinates[1] += point[1];
                    }
                    coordinatesCount += multiPoint.length;
                }
                const centerCoordinate: number[] = [sumCoordinates[0] / coordinatesCount, sumCoordinates[1] / coordinatesCount];
                this.mapPoints.push({
                    coordinates: centerCoordinate,
                    type: item.type,
                })
                break;
            }
            case 'MultiPolygon': {
                let coordinatesCount = 0;
                const sumCoordinates: number[] = [0, 0];
                for (const polygon of item.coordinates) {
                    for (const multiPoint of polygon) {
                        for (const point of multiPoint) {
                            sumCoordinates[0] += point[0];
                            sumCoordinates[1] += point[1];
                        }
                        coordinatesCount += multiPoint.length;
                    }
                }
                const centerCoordinate: number[] = [sumCoordinates[0] / coordinatesCount, sumCoordinates[1] / coordinatesCount];
                this.mapPoints.push({
                    coordinates: centerCoordinate,
                    type: item.type,
                })
                break;
            }
            default:
                break;
        }
    }

    protected readonly document = document;
}
