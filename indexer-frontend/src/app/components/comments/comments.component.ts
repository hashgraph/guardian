import { Component, Input, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { LoadingComponent } from '@components/loading/loading.component';
import { MatTabsModule } from '@angular/material/tabs';
import { NgxEchartsDirective } from 'ngx-echarts';
import { MatInputModule } from '@angular/material/input';
import { TranslocoModule } from '@jsverse/transloco';
import { EntitiesService } from '@services/entities.service';
import { TabViewModule } from 'primeng/tabview';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ButtonModule } from 'primeng/button';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { bytesToUtf8, decryptWithKeyDerivedFromString } from '@meeco/cryppo';

class List {
    public items: any[];
    public total: number;
    public next: boolean;

    public pageIndex: number;
    public pageSize: number;

    constructor(pageSize: number) {
        this.items = [];
        this.total = 0;
        this.next = this.items.length < this.total;
        this.pageSize = pageSize;
        this.pageIndex = -1;
    }

    public clear() {
        this.items = [];
        this.total = 0;
        this.next = this.items.length < this.total;
        this.pageIndex = -1;
    }

    public setData(data: {
        items: any[],
        pageIndex: number,
        pageSize: number,
        total: number
    }) {
        this.total = data.total;
        this.pageIndex = data.pageIndex

        const startIndex = this.pageIndex * this.pageSize;
        const endIndex = startIndex + data.items.length;

        this.setSize(endIndex);

        let i = 0;
        for (let index = startIndex; index < endIndex; index++) {
            this.items[index] = data.items[i];
            i++;
        }
        this.next = this.items.length < this.total;
    }

    private setSize(size: number) {
        const max = Math.max(size, this.items.length);
        const data = new Array(max);
        for (let index = 0; index < max; index++) {
            data[index] = this.items[index];
        }
        this.items = data;
    }
}

@Component({
    selector: 'app-comments',
    templateUrl: './comments.component.html',
    styleUrls: [
        './comments.component.scss',
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
        InputTextareaModule,
    ],
})
export class CommentsComponent {
    @Input('target-id') targetId!: string;
    @Input('discussion-id') discussionId!: string;
    @Input('key') key!: string;
    @Input('discussion') discussion!: any;

    @ViewChild('messages', { static: false }) messages: any;

    public loading: boolean = true;
    public data = new List(10);

    constructor(
        private entitiesService: EntitiesService,
        private route: ActivatedRoute,
        private router: Router
    ) {

    }

    ngOnInit() {
        this.loading = true;
        this.loadData();
    }

    private loadData(): void {
        if (this.targetId && this.discussionId) {
            this.loading = true;
            const filters = {
                pageIndex: this.data.pageIndex + 1,
                pageSize: this.data.pageSize
            }
            this.entitiesService
                .getVcComments(this.targetId, this.discussionId, filters)
                .subscribe({
                    next: (result) => {
                        this.setResult(result).then(() => {
                            setTimeout(() => {
                                if (this.messages) {
                                    this.messages.nativeElement.scrollTop = this.messages.nativeElement.scrollHeight;
                                }
                                this.loading = false;
                            }, 500);
                        });
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

    public onNext() {
        this.loadData();
    }

    private async setResult(result?: any) {
        try {
            if (result) {
                for (const item of result.items) {
                    item._status = 'decrypting';
                }
                await this.decryptMessages(result.items).then();
                this.data.setData(result);
            } else {
                this.data.clear();
            }
        } catch (error) {
            console.error(error);
        }
    }

    public async decryptMessages(items: any[]) {
        for (const item of items) {
            const encryptedData = item.documents[0];
            const decryptedData = await this.decryptData(this.key, encryptedData);
            if (decryptedData) {
                item._document = decryptedData;
                item._subject = this.getCredentialSubject(decryptedData);
                this.parseMessage(item);
                item._status = 'decrypted';
            } else {
                item._status = 'encrypted';
            }
        }
    }

    private async decryptData(key: string, encryptedData: string): Promise<string | null> {
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

    private async decryptFile(key: string, encryptedData: string): Promise<any | null> {
        try {
            if (!encryptedData?.startsWith('Aes256')) {
                return null;
            }
            const decrypted: any = await decryptWithKeyDerivedFromString({
                serialized: encryptedData,
                passphrase: key,
            });
            return decrypted;
        } catch (error) {
            console.error('Decryption failed:', error);
            return null;
        }
    }

    private getCredentialSubject(item: any): any {
        try {
            return item.credentialSubject[0];
        } catch (error) {
            return {};
        }
    }

    private parseMessage(item: any) {
        item._date = this.getDate(item.consensusTimestamp);
        item._sender = item._subject?.sender;
        item._senderName = item._subject?.senderName;
        item._senderRole = item._subject?.senderRole;
        item._text = item._subject?.text;
        item._files = item._subject?.files;
    }

    public getDate(value: any) {
        const fixedTimestamp = Math.floor(value * 1000);
        value = new Date(fixedTimestamp);
        const formattedDate = value.toLocaleString();
        return formattedDate;
    }

    public onLoadFile(file: any) {
        file.loading = true;
        this.entitiesService
            .loadFile(file.cid)
            .subscribe({
                next: (data: string) => {
                    this.parseFile(file, data);
                },
                error: ({ message }) => {
                    this.loading = false;
                    console.error(message);
                },
            });
    }

    private async parseFile(file: any, data: string) {
        const buffer = await this.decryptFile(this.key, atob(data));
        this.downloadFile(buffer, file.name, file.type);
        file.loading = false;
    }

    public downloadFile(
        data: ArrayBuffer,
        name: string,
        type: string
    ) {
        const blob = new Blob([data], { type: type });
        const url = window.URL.createObjectURL(blob);
        const downloadLink = document.createElement('a');
        downloadLink.href = url;
        downloadLink.setAttribute('download', name);
        document.body.appendChild(downloadLink);
        downloadLink.click();
        downloadLink.remove();
        window.URL.revokeObjectURL(url);
    }

    public getSize(bytes: number): string {
        if (bytes === 0) {
            return "0 Bytes";
        }
        const sizes = ["Bytes", "Kb", "Mb", "Gb", "Tb"];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return (bytes / Math.pow(1024, i)).toFixed(1) + " " + sizes[i];
    }
}
