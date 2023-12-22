import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';
import {
    IImpactReport,
    IconType,
    IPolicyReport,
    IReport,
    IReportItem,
    ITokenReport,
    IVCReport,
    IVPReport,
} from '@guardian/interfaces';
import { VCViewerDialog } from 'src/app/modules/schema-engine/vc-dialog/vc-dialog.component';
import { IPFSService } from 'src/app/services/ipfs.service';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { WebSocketService } from 'src/app/services/web-socket.service';
import { IconsArray } from './iconsArray';
import { DialogService } from 'primeng/dynamicdialog';

interface IAdditionalDocument {
    vpDocument?: IVPReport | undefined;
    vcDocument?: IVCReport | undefined;
    mintDocument?: ITokenReport | undefined;
    primaryImpacts?: IImpactReport[] | undefined;
    secondaryImpacts?: IImpactReport[] | undefined;
}

/**
 * Component for display block of 'ReportBlock' types.
 */
@Component({
    selector: 'app-report-block',
    templateUrl: './report-block.component.html',
    styleUrls: ['./report-block.component.scss'],
})
export class ReportBlockComponent implements OnInit {
    @Input('id') id!: string;
    @Input('policyId') policyId!: string;
    @Input('static') static!: any;

    hash: string = '';
    loading: boolean = true;
    socket: any;
    content: string | null = null;
    chainVisible: boolean = false;
    mainDocuments: IAdditionalDocument[] | undefined;
    policyDocument: IPolicyReport | undefined;
    documents: any;
    policyCreatorDocument: IReportItem | undefined;
    searchForm = this.fb.group({
        value: ['', Validators.required],
    });

    constructor(
        private policyEngineService: PolicyEngineService,
        private wsService: WebSocketService,
        private fb: FormBuilder,
        public dialog: MatDialog,
        private dialogService: DialogService,
        iconRegistry: MatIconRegistry,
        sanitizer: DomSanitizer,
        private ipfs: IPFSService
    ) {
        for (let i = 0; i < IconsArray.length; i++) {
            const element = IconsArray[i];
            iconRegistry.addSvgIconLiteral(
                element.name,
                sanitizer.bypassSecurityTrustHtml(element.icon)
            );
        }
    }

    ngOnInit(): void {
        if (!this.static) {
            this.socket = this.wsService.blockSubscribe(
                this.onUpdate.bind(this)
            );
        }
        this.loadData();
    }

    ngOnDestroy(): void {
        if (this.socket) {
            this.socket.unsubscribe();
        }
    }

    onUpdate(blocks: string[]): void {
        if (Array.isArray(blocks) && blocks.includes(this.id)) {
            this.loadData();
        }
    }

    loadData() {
        this.loading = true;
        if (this.static) {
            this.setData(this.static);
            setTimeout(() => {
                this.loading = false;
            }, 500);
        } else {
            this.loading = true;
            this.policyEngineService
                .getBlockData(this.id, this.policyId)
                .subscribe(
                    (data: any) => {
                        this.setData(data);
                        this.loading = false;
                    },
                    (e) => {
                        console.error(e.error);
                        this.loading = false;
                    }
                );
        }
    }

    setData(data: any) {
        if (data && data.data) {
            this.chainVisible = true;
            this.loadTrustChainData(data);
        } else {
            this.chainVisible = false;
            this.mainDocuments = undefined;
            this.policyDocument = undefined;
            this.documents = undefined;
            this.hash = '';
        }
    }

    loadTrustChainData(data: any) {
        const uiMetaData = data.uiMetaData || {};
        const report = data.data as IReport;
        this.hash = data.hash;
        this.searchForm.patchValue({
            value: this.hash,
        });
        this.policyDocument = report.policyDocument;
        this.policyCreatorDocument = report.policyCreatorDocument;
        this.documents = report.documents || [];

        const mainDocument = this.createAdditionalDocument(report);
        if (mainDocument) {
            this.mainDocuments = [mainDocument];
            if (report.additionalDocuments) {
                for (const doc of report.additionalDocuments) {
                    const additionalDocument = this.createAdditionalDocument(
                        doc
                    );
                    if (additionalDocument) {
                        this.mainDocuments.push(additionalDocument);
                    }
                }
            }
        } else {
            this.mainDocuments = undefined;
        }

        if (this.policyDocument) {
            this.documents.push({
                type: this.policyDocument.type,
                title: 'Policy',
                description: this.policyDocument.tag,
                tag: this.policyDocument.tag,
                visible: true,
                issuer: this.policyDocument.issuer,
                username: this.policyDocument.username,
                document: this.policyDocument.document,
            });
        }
        if (this.policyCreatorDocument) {
            this.documents.push(this.policyCreatorDocument);
        }
        this.documents = this.documents.filter((e: any) => e.visible);
        this.documents = this.documents.reverse();
        this.documents.forEach((reportItem: any) => {
            if (!Array.isArray(reportItem.document) && reportItem.document) {
                reportItem.document = [
                    {
                        document: reportItem.document,
                        tag: reportItem.tag,
                        issuer: reportItem.issuer,
                        username: reportItem.username,
                    },
                ];
            }
            if (reportItem.multiple && reportItem.document[0]) {
                this.onMultipleDocumentClick(
                    reportItem.document[0],
                    reportItem
                );
            }
            if (reportItem.iconType === IconType.CUSTOM) {
                const iconLink = reportItem.icon;
                reportItem.icon = '';
                this.ipfs.getImageByLink(iconLink).then((res) => {
                    reportItem.icon = res;
                });
            }
        });
        this.loading = false;
    }

    createAdditionalDocument(report: any): IAdditionalDocument | null {
        if (!(report.vpDocument || report.vcDocument)) {
            return null;
        }
        const result: IAdditionalDocument = {};
        result.vpDocument = report.vpDocument;
        result.vcDocument = report.vcDocument;
        result.mintDocument = report.mintDocument;
        const impacts: any[] = report.impacts;
        result.primaryImpacts = impacts?.filter(
            (i) => i.impactType === 'Primary Impacts'
        );
        result.secondaryImpacts = impacts?.filter(
            (i) => i.impactType !== 'Primary Impacts'
        );
        return result;
    }

    openVCDocument(
        item: any,
        document?: any
    ) {
        const dialogRef = this.dialogService.open(VCViewerDialog, {
            width: '850px',
            closable: true,
            header: 'VC',
            styleClass: 'custom-dialog',
            data: {
                id: item.document.id,
                dryRun: !!item.document.dryRunId,
                viewDocument: true,
                document: document || item.document.document,
                title: item.type,
                type: 'VC',
            },
        });
        dialogRef.onClose.subscribe(async (result) => {
        });
    }

    openVPDocument(item: any) {
        const dialogRef = this.dialogService.open(VCViewerDialog, {
            width: '850px',
            closable: true,
            header: 'VP',
            styleClass: 'custom-dialog',
            data: {
                id: item.document.id,
                dryRun: !!item.document.dryRunId,
                viewDocument: true,
                document: item.document.document,
                title: item.type,
                type: 'VP',
            },
        });
        dialogRef.onClose.subscribe(async (result) => {
        });
    }

    openJsonDocument(item: ITokenReport) {
        const dialogRef = this.dialogService.open(VCViewerDialog, {
            width: '850px',
            closable: true,
            header: 'Json',
            styleClass: 'custom-dialog',
            data: {
                document: item.document.document,
                title: item.type,
                type: 'JSON',
            },
        });
        dialogRef.onClose.subscribe(async (result) => {
        });
    }

    mapData(data: any[]) {
        const chain: any[] = data;
        return chain;
    }

    onWheel(event: WheelEvent) {
        event.preventDefault();
        (event.currentTarget as HTMLDivElement).scrollLeft += event.deltaY;
    }

    onScrollButtonPress(target: HTMLDivElement, amount: number = 0) {
        target.scrollBy({
            behavior: 'smooth',
            left: amount,
        });
    }

    updateFilter() {
        this.loading = true;
        this.policyEngineService
            .setBlockData(this.id, this.policyId, {
                filterValue: this.searchForm.value.value,
            })
            .subscribe(
                () => {
                    this.loadData();
                },
                (e) => {
                    console.error(e.error);
                    this.loading = false;
                }
            );
    }

    onBackClick() {
        this.loading = true;
        this.policyEngineService
            .setBlockData(this.id, this.policyId, {filterValue: null})
            .subscribe(
                () => {
                    this.loadData();
                },
                (e) => {
                    console.error(e.error);
                    this.loading = false;
                }
            );
    }

    dynamicSortItems(item?: any, activeDocument?: any) {
        if (
            !item ||
            !this.documents ||
            !activeDocument ||
            !item.dynamicFilters ||
            !item.dynamicFilters.length
        ) {
            return;
        }
        const itemIndex = this.documents.indexOf(item);
        const prevReportItem = this.documents[itemIndex - 1];
        if (!prevReportItem) {
            return;
        }
        prevReportItem.allDocuments =
            prevReportItem.allDocuments ||
            JSON.parse(JSON.stringify(prevReportItem.document));
        for (const dynamicFilter of item.dynamicFilters) {
            this.applyFilters(
                prevReportItem,
                activeDocument,
                dynamicFilter.field,
                dynamicFilter.nextItemField,
                dynamicFilter.type
            );
        }
        this.onMultipleDocumentClick(
            prevReportItem.document[0],
            prevReportItem
        );
    }

    applyFilters(
        reportItemToSort: any,
        activeDocument: any,
        field: string,
        nextItemField: string,
        type: string
    ) {
        switch (type) {
            case 'equal':
                reportItemToSort.document = reportItemToSort.allDocuments.filter(
                    (item: any) =>
                        item.document[nextItemField] ===
                        activeDocument.document[field]
                );
                break;
            case 'not_equal':
                reportItemToSort.document = reportItemToSort.allDocuments.filter(
                    (item: any) =>
                        item.document[nextItemField] !==
                        activeDocument.document[field]
                );
                break;
            case 'in':
                reportItemToSort.document = reportItemToSort.allDocuments.filter(
                    (item: any) =>
                        activeDocument.document[field].includes(
                            item.document[nextItemField]
                        )
                );
                break;
            case 'not_in':
                reportItemToSort.document = reportItemToSort.allDocuments.filter(
                    (item: any) =>
                        !activeDocument.document[field].includes(
                            item.document[nextItemField]
                        )
                );
                break;
        }
    }

    onMultipleDocumentClick(activeDocument?: any, item?: any) {
        if (!item || !item.multiple || !activeDocument) {
            return;
        }

        const itemDocuments = item.document;
        const oldActiveDocument = itemDocuments.find(
            (item: any) => item.index === 0
        );
        if (oldActiveDocument == activeDocument) {
            return;
        }

        itemDocuments.forEach((element: any) => {
            element.index = undefined;
            element.color = undefined;
        });
        activeDocument.index = 0;
        const indexDocument = itemDocuments.indexOf(activeDocument);
        if (itemDocuments.length > 1) {
            const secondDocumentIndex =
                (indexDocument + 1) % itemDocuments.length;
            itemDocuments[secondDocumentIndex].index = 1;
        }
        if (itemDocuments.length > 2) {
            const thirdDocumentIndex =
                (indexDocument + 2) % itemDocuments.length;
            itemDocuments[thirdDocumentIndex].index = 2;
        }
        item.activeDocumentIndex = item.document.indexOf(activeDocument) + 1;
        this.dynamicSortItems(item, activeDocument);
    }

    onNextDocumentClick(event: any, item: any, document: any) {
        event.stopPropagation();
        const itemDocuments = item.document;
        const indexDocument = itemDocuments.indexOf(document);
        const secondDocumentIndex = (indexDocument + 1) % itemDocuments.length;
        this.onMultipleDocumentClick(itemDocuments[secondDocumentIndex], item);
    }

    onPrevDocumentClick(event: any, item: any, document: any) {
        event.stopPropagation();
        const itemDocuments = item.document;
        const indexDocument = itemDocuments.indexOf(document);
        const secondDocumentIndex =
            indexDocument - 1 < 0
                ? itemDocuments.length + (indexDocument - 1)
                : indexDocument - 1;
        this.onMultipleDocumentClick(itemDocuments[secondDocumentIndex], item);
    }
}
