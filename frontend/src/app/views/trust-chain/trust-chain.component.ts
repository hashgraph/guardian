import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { IVC } from 'interfaces';
import { JsonDialog } from 'src/app/components/dialogs/vc-dialog/vc-dialog.component';
import { AuditService } from 'src/app/services/audit.service';
import { AuthService } from '../../services/auth.service';

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
    vp: any;
    vpMint: any;
    vpPolicy: any;

    hasParam: boolean = false;

    constructor(
        private auth: AuthService,
        private auditService: AuditService,
        private route: ActivatedRoute,
        private router: Router,
        private fb: FormBuilder,
        public dialog: MatDialog) {

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
                const vcMint: IVC = this.vp.document.verifiableCredential.find((vc: IVC) => vc.type.includes('MintToken'));
                this.vpMint = {
                    ...vcMint.credentialSubject[0],
                    issuer: vcMint.issuer,
                    document: vcMint,
                    schema: 'MintToken',
                    tag: 'Mint Token'
                };
                const vcPolicy: any = this.chain.find((vc: any) => vc.type === 'VC' && vc.schema === 'Policy');

                this.vpPolicy = {
                    ...vcPolicy.document.credentialSubject[0],
                    issuer: vcPolicy.document.issuer,
                    document: vcPolicy.document
                } ?? {};

                this.chain.push(this.vpMint);

                console.log('VP', this.vp, this.vpMint, this.vpPolicy);
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
                document: item.document,
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

    formatFields(obj: any): string {
        return (obj.tag ?? '').replace(/_/g, ' ');
    }
}