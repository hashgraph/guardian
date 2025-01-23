import {Component, OnInit} from '@angular/core';
import {UntypedFormBuilder, Validators} from '@angular/forms';
import {DomSanitizer} from '@angular/platform-browser';
import {ActivatedRoute, Router} from '@angular/router';
import {IVC} from '@guardian/interfaces';
import {AuditService} from '../../services/audit.service';
import {AuthService} from '../../services/auth.service';
import {forkJoin} from 'rxjs';
import {VCViewerDialog} from '../../modules/schema-engine/vc-dialog/vc-dialog.component';
import {DialogService} from 'primeng/dynamicdialog';

/**
 * Page to find VP Documents and display Trust Chain.
 */
@Component({
    selector: 'app-trust-chain',
    templateUrl: './trust-chain.component.html',
    styleUrls: ['./trust-chain.component.css']
})
export class TrustChainComponent implements OnInit {
    loading: boolean = true;
    searchForm = this.fb.group({
        value: ['', Validators.required],
    });
    chain!: any[];
    userMap: any = {};
    vp!: any;
    vpMint!: any;
    vpPolicy: any;

    hasParam: boolean = false;

    constructor(
        private auth: AuthService,
        private auditService: AuditService,
        private route: ActivatedRoute,
        private router: Router,
        private fb: UntypedFormBuilder,
        private dialogService: DialogService,
        sanitizer: DomSanitizer
    ) {
    }

    ngOnInit() {
        this.loading = true;
        this.route.queryParams.subscribe(queryParams => {
            const value = this.route.snapshot.queryParams['search'] || '';
            this.searchForm.setValue({
                value: value
            })
            this.hasParam = !!value;
            this.loadData();
        });
    }

    updateFilter() {
        if (this.searchForm.valid) {
            this.router.navigate(['/trust-chain'], {
                queryParams: {
                    search: this.searchForm.value.value
                }
            });
        }
    }

    loadData() {
        const value = this.searchForm.value.value;
        if (value) {
            this.loading = true;

            forkJoin([
                this.auditService.searchHash(value)
            ]).subscribe((value) => {
                const documents: any = value[0];

                const {chain, userMap} = documents;
                this.userMap = {};
                userMap.forEach((user: any) => {
                    this.userMap[user.did] = user.username;
                });

                this.chain = this.mapData(chain).filter(d => d.type === 'VC').reverse();
                this.vp = this.mapData(chain).find(d => d.type === 'VP');

                if (this.vp) {
                    const vcMint: IVC = this.vp.document.verifiableCredential[this.vp.document.verifiableCredential.length - 1];
                    if (vcMint) {
                        this.vpMint = {
                            ...vcMint.credentialSubject[0],
                            issuer: this.getIssuer(vcMint),
                            document: vcMint,
                            schema: vcMint.credentialSubject[0].type,
                            entity: 'Mint',
                            tag: 'Mint Token'
                        };
                        this.chain.push(this.vpMint);
                    } else {
                        this.vpMint = null;
                    }
                } else {
                    this.vpMint = null;
                }

                const vcPolicy: any = this.chain.find((vc: any) => vc.entity === 'Policy');
                if (vcPolicy) {
                    this.vpPolicy = {
                        ...vcPolicy.document.credentialSubject[0],
                        issuer: this.getIssuer(vcPolicy.document),
                        document: vcPolicy.document
                    };
                } else {
                    this.vpPolicy = null;
                }

                this.loading = false;
            }, ({message}) => {
                this.loading = false;
                console.error(message);
            });
        } else {
            this.loading = false;
        }
    }

    openVCDocument(item: any) {
        const title = `${item.type?.toUpperCase()} Document`;
        const dialogRef = this.dialogService.open(VCViewerDialog, {
            showHeader: false,
            width: '1000px',
            styleClass: 'guardian-dialog',
            data: {
                id: item.id,
                row: item,
                dryRun: !!item.dryRunId,
                viewDocument: true,
                document: item.document,
                title: title,
                type: 'VC'
            }
        });
        dialogRef.onClose.subscribe(async (result) => {
        });
    }

    openVPDocument(item: any) {
        const title = `${item.type?.toUpperCase()} Document`;
        const dialogRef = this.dialogService.open(VCViewerDialog, {
            showHeader: false,
            width: '1000px',
            styleClass: 'guardian-dialog',
            data: {
                id: item.id,
                row: item,
                dryRun: !!item.dryRunId,
                viewDocument: true,
                document: item.document,
                title: title,
                type: 'VP'
            }
        });
        dialogRef.onClose.subscribe(async (result) => {
        });
    }

    openJsonDocument(item: any) {
        const title = `${item.type?.toUpperCase()} Document`;
        const dialogRef = this.dialogService.open(VCViewerDialog, {
            showHeader: false,
            width: '1000px',
            styleClass: 'guardian-dialog',
            data: {
                id: item.id,
                row: item,
                dryRun: !!item.dryRunId,
                document: item.document,
                title: title,
                type: 'JSON',
            }
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
            left: amount
        });
    }

    formatFields(obj: any): string {
        return (obj.tag ?? '').replace(/_/g, ' ');
    }

    getParties(item: any): string {
        let issuer = this.getIssuer(item.document);
        if (issuer in this.userMap) {
            return this.userMap[issuer];
        } else if (item.owner in this.userMap) {
            return this.userMap[item.owner];
        }
        return issuer;
    }

    getIssuer(document: any): string {
        if (typeof document.issuer === 'string') {
            return document.issuer;
        } else {
            return document.issuer.id;
        }
    }
}
