import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';
import { IPolicyReport, IReport, IReportItem, ITokenReport, IVCReport, IVPReport } from '@guardian/interfaces';
import { VCViewerDialog } from 'src/app/schema-engine/vc-dialog/vc-dialog.component';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { WebSocketService } from 'src/app/services/web-socket.service';
import { IconsArray } from './iconsArray';

/**
 * Component for display block of 'ReportBlock' types.
 */
@Component({
    selector: 'app-report-block',
    templateUrl: './report-block.component.html',
    styleUrls: ['./report-block.component.css']
})
export class ReportBlockComponent implements OnInit {
    @Input('id') id!: string;
    @Input('policyId') policyId!: string;
    @Input('static') static!: any;

    hash: string = "";
    loading: boolean = true;
    socket: any;
    content: string | null = null;
    chainVisible: boolean = false;
    vpDocument: IVPReport | undefined;
    vcDocument: IVCReport | undefined;
    mintDocument: ITokenReport | undefined;
    policyDocument: IPolicyReport | undefined;
    documents: IReportItem[] | undefined;
    policyCreatorDocument: IReportItem | undefined;
    searchForm = this.fb.group({
        value: ['', Validators.required],
    });

    constructor(
        private policyEngineService: PolicyEngineService,
        private wsService: WebSocketService,
        private fb: FormBuilder,
        public dialog: MatDialog,
        iconRegistry: MatIconRegistry,
        sanitizer: DomSanitizer
    ) {
        for (let i = 0; i < IconsArray.length; i++) {
            const element = IconsArray[i];
            iconRegistry.addSvgIconLiteral(element.name, sanitizer.bypassSecurityTrustHtml(element.icon));
        }
    }

    ngOnInit(): void {
        if (!this.static) {
            this.socket = this.wsService.blockSubscribe(this.onUpdate.bind(this));
        }
        this.loadData();
    }

    ngOnDestroy(): void {
        if (this.socket) {
            this.socket.unsubscribe();
        }
    }

    onUpdate(id: string): void {
        if (this.id == id) {
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
            this.policyEngineService.getBlockData(
                this.id,
                this.policyId
            ).subscribe((data: any) => {
                this.setData(data);
                this.loading = false;
            }, (e) => {
                console.error(e.error);
                this.loading = false;
            });
        }
    }

    setData(data: any) {
        if (data && data.data) {
            this.chainVisible = true;
            this.loadTrustChainData(data);
        } else {
            this.chainVisible = false;
            this.vpDocument = undefined;
            this.vcDocument = undefined;
            this.mintDocument = undefined;
            this.policyDocument = undefined;
            this.documents = undefined;
            this.hash = "";
        }
    }

    loadTrustChainData(data: any) {
        const uiMetaData = data.uiMetaData || {};
        const report = data.data as IReport;
        this.hash = data.hash;
        this.searchForm.patchValue({
            value: this.hash
        });
        this.vpDocument = report.vpDocument;
        this.vcDocument = report.vcDocument;
        this.mintDocument = report.mintDocument;
        this.policyDocument = report.policyDocument;
        this.policyCreatorDocument = report.policyCreatorDocument;
        this.documents = report.documents || [];
        if (this.policyDocument) {
            this.documents.push({
                type: this.policyDocument.type,
                title: 'Policy',
                description: this.policyDocument.tag,
                tag: this.policyDocument.tag,
                visible: true,
                issuer: this.policyDocument.issuer,
                username: this.policyDocument.username,
                document: this.policyDocument.document
            });
        }
        if (this.policyCreatorDocument) {
            this.documents.push(this.policyCreatorDocument);
        }
        this.documents = this.documents.filter(e=>e.visible);
        this.documents = this.documents.reverse();
        this.loading = false;
    }


    openVCDocument(item: IVCReport | ITokenReport | IPolicyReport | IReportItem) {
        const dialogRef = this.dialog.open(VCViewerDialog, {
            width: '850px',
            data: {
                viewDocument: true,
                document: item.document.document,
                title: item.type,
                type: 'VC'
            }
        });
        dialogRef.afterClosed().subscribe(async (result) => { });
    }

    openVPDocument(item: IVPReport) {
        const dialogRef = this.dialog.open(VCViewerDialog, {
            width: '850px',
            data: {
                viewDocument: true,
                document: item.document.document,
                title: item.type,
                type: 'VP'
            }
        });
        dialogRef.afterClosed().subscribe(async (result) => { });
    }

    openJsonDocument(item: ITokenReport) {
        const dialogRef = this.dialog.open(VCViewerDialog, {
            width: '850px',
            data: {
                document: item.document.document,
                title: item.type,
                type: 'JSON',
            }
        });
        dialogRef.afterClosed().subscribe(async (result) => { });
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
            left: amount
        });
    }

    updateFilter() {
        this.loading = true;
        this.policyEngineService.setBlockData(this.id, this.policyId, { filterValue: this.searchForm.value.value }).subscribe(() => {
            this.loadData();
        }, (e) => {
            console.error(e.error);
            this.loading = false;
        });
    }

    onBackClick() {
        this.loading = true;
        this.policyEngineService.setBlockData(this.id, this.policyId, { filterValue: null }).subscribe(() => {
            this.loadData();
        }, (e) => {
            console.error(e.error);
            this.loading = false;
        });
    }
}
