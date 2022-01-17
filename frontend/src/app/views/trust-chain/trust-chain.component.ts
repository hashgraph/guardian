import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { IVC } from 'interfaces';
import { JsonDialog } from 'src/app/components/dialogs/vc-dialog/vc-dialog.component';
import { AuditService } from 'src/app/services/audit.service';
import { AuthService } from '../../services/auth.service';

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
        private fb: FormBuilder,
        public dialog: MatDialog,
        iconRegistry: MatIconRegistry,
        sanitizer: DomSanitizer) {
        iconRegistry.addSvgIconLiteral('iot', sanitizer.bypassSecurityTrustHtml(`
        <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" height="300px" width="300px" fill="#000000" version="1.1" x="0px" y="0px" viewBox="0 0 100 100" enable-background="new 0 0 100 100" xml:space="preserve"><path d="M82.796,39.013l-9.489-16.478c1.177-1.214,1.903-2.868,1.903-4.688c0-3.718-3.025-6.744-6.744-6.744  s-6.744,3.025-6.744,6.744c0,3.719,3.025,6.744,6.744,6.744c0.449,0,0.887-0.045,1.311-0.129l9.535,16.557  c0.372,0.646,1.048,1.008,1.743,1.008c0.341,0,0.686-0.087,1.002-0.269C83.02,41.204,83.35,39.975,82.796,39.013z M65.742,17.847  c0-1.502,1.223-2.724,2.725-2.724s2.725,1.222,2.725,2.724s-1.223,2.725-2.725,2.725S65.742,19.349,65.742,17.847z"/><path d="M75.731,73.483l9.874-16.25c1.63,0.447,3.429,0.288,5.025-0.589c3.259-1.79,4.454-5.897,2.664-9.157  c-1.791-3.259-5.898-4.454-9.157-2.663c-3.259,1.79-4.454,5.897-2.664,9.156c0.216,0.394,0.466,0.756,0.744,1.088l-9.921,16.329  c-0.387,0.637-0.378,1.404-0.044,2.014c0.164,0.297,0.406,0.558,0.717,0.748C73.918,74.734,75.155,74.432,75.731,73.483z   M86.071,48.346c1.317-0.723,2.976-0.24,3.7,1.077c0.723,1.317,0.24,2.976-1.076,3.699c-1.316,0.723-2.976,0.24-3.699-1.076  C84.273,50.729,84.755,49.07,86.071,48.346z"/><path d="M16.334,62.001l9.489,16.479c-1.176,1.214-1.903,2.867-1.903,4.688c0,3.719,3.025,6.744,6.744,6.744  c3.719,0,6.744-3.025,6.744-6.744c0-3.718-3.025-6.744-6.744-6.744c-0.449,0-0.887,0.046-1.311,0.13l-9.536-16.558  c-0.372-0.646-1.048-1.006-1.743-1.006c-0.34,0-0.686,0.086-1.001,0.268C16.111,59.811,15.78,61.04,16.334,62.001z M33.388,83.167  c0,1.502-1.223,2.725-2.725,2.725c-1.501,0-2.724-1.222-2.724-2.725c0-1.501,1.223-2.723,2.724-2.723  C32.166,80.444,33.388,81.666,33.388,83.167z"/><path d="M23.667,27.531l-9.874,16.25c-1.631-0.447-3.43-0.288-5.026,0.589c-3.259,1.791-4.454,5.899-2.663,9.158  c1.79,3.259,5.897,4.454,9.157,2.664c3.26-1.791,4.455-5.898,2.664-9.158c-0.216-0.393-0.466-0.756-0.745-1.087l9.921-16.329  c0.387-0.637,0.378-1.404,0.044-2.013c-0.164-0.298-0.406-0.56-0.718-0.749C25.48,26.281,24.244,26.583,23.667,27.531z   M13.326,52.669c-1.316,0.723-2.976,0.241-3.699-1.076c-0.723-1.316-0.24-2.976,1.076-3.699c1.317-0.724,2.977-0.24,3.7,1.076  C15.126,50.287,14.644,51.946,13.326,52.669z"/><path d="M55.991,16.189l-19.015-0.02c-0.463-1.626-1.532-3.082-3.109-3.992c-3.22-1.858-7.353-0.751-9.212,2.469  c-1.858,3.221-0.75,7.354,2.47,9.212s7.353,0.75,9.211-2.469c0.225-0.389,0.404-0.792,0.545-1.201l19.106,0.02  c0.746,0,1.396-0.404,1.744-1.007c0.17-0.294,0.268-0.637,0.268-1.002C58,17.091,57.101,16.19,55.991,16.189z M29.133,20.377  c-1.3-0.75-1.748-2.419-0.997-3.72c0.75-1.302,2.419-1.749,3.72-0.998s1.749,2.42,0.998,3.72  C32.104,20.681,30.434,21.128,29.133,20.377z"/><path d="M40.876,83.386c0,0.365,0.098,0.707,0.268,1.002c0.348,0.602,0.999,1.007,1.745,1.006l19.106-0.019  c0.14,0.41,0.319,0.812,0.544,1.201c1.858,3.22,5.991,4.328,9.212,2.469c3.22-1.858,4.328-5.991,2.469-9.211  c-1.858-3.221-5.992-4.329-9.212-2.469c-1.576,0.91-2.646,2.365-3.108,3.991l-19.015,0.019  C41.774,81.375,40.875,82.276,40.876,83.386z M66.019,84.565c-0.75-1.3-0.303-2.97,0.998-3.721c1.3-0.751,2.97-0.304,3.722,0.997  c0.75,1.301,0.303,2.971-0.998,3.721C68.44,86.314,66.77,85.866,66.019,84.565z"/><g><path d="M49.377,57.114c-3.64,0-6.602-2.962-6.602-6.602s2.962-6.602,6.602-6.602c3.641,0,6.602,2.962,6.602,6.602   S53.018,57.114,49.377,57.114z M49.377,47.661c-1.572,0-2.851,1.279-2.851,2.851c0,1.572,1.279,2.851,2.851,2.851   c1.572,0,2.851-1.279,2.851-2.851C52.228,48.94,50.949,47.661,49.377,47.661z"/></g><g><path d="M37.561,52.388c-1.037,0-1.876-0.84-1.876-1.876c0-7.55,6.142-13.692,13.692-13.692c1.037,0,1.876,0.839,1.876,1.876   c0,1.035-0.839,1.875-1.876,1.875c-5.481,0-9.941,4.459-9.941,9.941C39.436,51.548,38.596,52.388,37.561,52.388z"/></g><path fill="none" stroke="#000000" stroke-width="14" stroke-miterlimit="10" d="M37.561,50.512"/><path fill="none" stroke="#000000" stroke-width="14" stroke-miterlimit="10" d="M49.377,62.328"/><g><path d="M49.377,64.204c-1.036,0-1.875-0.839-1.875-1.875c0-1.035,0.84-1.875,1.875-1.875c5.481,0,9.94-4.46,9.94-9.941   c0-1.036,0.84-1.875,1.876-1.875s1.875,0.84,1.875,1.875C63.069,58.062,56.927,64.204,49.377,64.204z"/></g><path fill="none" stroke="#000000" stroke-width="14" stroke-miterlimit="10" d="M61.193,50.512"/><path fill="none" stroke="#000000" stroke-width="14" stroke-miterlimit="10" d="M49.377,38.696"/><g><path d="M30.802,52.388c-1.035,0-1.875-0.84-1.875-1.876c0-11.276,9.175-20.451,20.452-20.451c1.036,0,1.876,0.84,1.876,1.875   c0,1.037-0.84,1.876-1.876,1.876c-9.208,0-16.7,7.491-16.7,16.699C32.678,51.548,31.839,52.388,30.802,52.388z"/></g><path fill="none" stroke="#000000" stroke-width="14" stroke-miterlimit="10" d="M30.802,50.512"/><path fill="none" stroke="#000000" stroke-width="14" stroke-miterlimit="10" d="M49.378,69.087"/><g><path d="M49.378,70.963c-1.037,0-1.875-0.84-1.875-1.876s0.839-1.876,1.875-1.876c9.208,0,16.699-7.492,16.699-16.7   c0-1.036,0.84-1.875,1.876-1.875c1.035,0,1.875,0.84,1.875,1.875C69.828,61.789,60.654,70.963,49.378,70.963z"/></g><path fill="none" stroke="#000000" stroke-width="14" stroke-miterlimit="10" d="M67.953,50.512"/><path fill="none" stroke="#000000" stroke-width="14" stroke-miterlimit="10" d="M49.378,31.936"/></svg>
        `));
        iconRegistry.addSvgIconLiteral('mrv', sanitizer.bypassSecurityTrustHtml(`
        <svg xmlns="http://www.w3.org/2000/svg" width="27" height="30" viewBox="0 0 27 30">
        <path id="Icon_material-grapheq" data-name="Icon material-grapheq" d="M10.5,27h3V9h-3Zm6,6h3V3h-3ZM4.5,21h3V15h-3Zm18,6h3V9h-3Zm6-12v6h3V15Z" transform="translate(-4.5 -3)"/>
        </svg>
        `));
        iconRegistry.addSvgIconLiteral('token', sanitizer.bypassSecurityTrustHtml(`
        <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
        <path id="Icon_awesome-coins" data-name="Icon awesome-coins" d="M0,28.5v3C0,33.982,6.047,36,13.5,36S27,33.982,27,31.5v-3c-2.9,2.046-8.212,3-13.5,3S2.9,30.544,0,28.5ZM22.5,9C29.953,9,36,6.982,36,4.5S29.953,0,22.5,0,9,2.018,9,4.5,15.047,9,22.5,9ZM0,21.122V24.75c0,2.482,6.047,4.5,13.5,4.5S27,27.232,27,24.75V21.122c-2.9,2.391-8.22,3.628-13.5,3.628S2.9,23.513,0,21.122Zm29.25.773C33.279,21.115,36,19.666,36,18V15a17.267,17.267,0,0,1-6.75,2.426ZM13.5,11.25C6.047,11.25,0,13.767,0,16.875S6.047,22.5,13.5,22.5,27,19.983,27,16.875,20.953,11.25,13.5,11.25Zm15.42,3.959c4.219-.759,7.08-2.25,7.08-3.959v-3c-2.5,1.765-6.785,2.714-11.3,2.939A7.874,7.874,0,0,1,28.92,15.209Z"/>
        </svg>
        `));
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
            this.auditService.searchHash(value).subscribe((data: any) => {
                const { chain, userMap } = data;
                this.userMap = {};
                userMap.forEach((user: any) => {
                    this.userMap[user.did] = user.username;
                });

                this.chain = this.mapData(chain).filter(d => d.type === 'VC').reverse();
                this.vp = this.mapData(chain).find(d => d.type === 'VP');

                if(this.vp) {
                    const vcMint: IVC = this.vp.document.verifiableCredential.find((vc: IVC) => vc.type.includes('MintToken') || vc.type.includes('MintNFToken'));
                    if (vcMint) {
                        this.vpMint = {
                            ...vcMint.credentialSubject[0],
                            issuer: vcMint.issuer,
                            document: vcMint,
                            schema: vcMint.type.includes('MintToken') ? 'MintToken' : 'MintNFToken',
                            tag: 'Mint Token',
                            cid: vcMint.cid
                        };
                        this.chain.push(this.vpMint);
                    } else {
                        this.vpMint = null;
                    }
                } else {
                    this.vpMint = null;
                }

                const vcPolicy: any = this.chain.find((vc: any) => vc.type === 'VC' && vc.schema === 'Policy');
                if (vcPolicy) {
                    this.vpPolicy = {
                        ...vcPolicy.document.credentialSubject[0],
                        issuer: vcPolicy.document.issuer,
                        document: vcPolicy.document,
                        cid:vcPolicy.cid
                    };
                } else {
                    this.vpPolicy = null;
                }

                this.loading = false;
            }, (error) => {
                this.loading = false;
                console.error(error);
            });
        } else {
            this.loading = false;
        }
    }

    openDocument(item: any,) {
        const dialogRef = this.dialog.open(JsonDialog, {
            width: '850px',
            data: {
                document: {
                    cid:item.cid,
                    document:item.document
                },
                title: item.type
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

    formatFields(obj: any): string {
        return (obj.tag ?? '').replace(/_/g, ' ');
    }

    getParties(item: any): string {
        if (item.document.issuer in this.userMap) return this.userMap[item.document.issuer];
        else if (item.owner in this.userMap) return this.userMap[item.owner];

        return item.document.issuer;
    }
}