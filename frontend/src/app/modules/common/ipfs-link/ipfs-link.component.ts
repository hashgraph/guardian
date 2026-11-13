import { Component, Input, OnChanges } from '@angular/core';
import { IPFSService } from 'src/app/services/ipfs.service';
import { ToastService } from 'src/app/services/toast.service';
import { ipfsCid, ipfsGatewayLink } from 'src/app/utils/ipfs-file';

@Component({
    selector: 'ipfs-link',
    templateUrl: './ipfs-link.component.html',
    styleUrls: ['./ipfs-link.component.scss'],
    standalone: false
})
export class IPFSLinkComponent implements OnChanges {
    @Input() url: string | undefined;

    @Input() dryRun = false;

    constructor(private ipfs: IPFSService, private toast: ToastService) {}

    public link = '';
    public cid = '';

    public ngOnChanges(): void {
        this.link = ipfsGatewayLink(this.url || '');
        this.cid = ipfsCid(this.url);
    }

    public openFile(event: MouseEvent): void {
        if (!this.dryRun || this.cid) {
            return;
        }
        event.preventDefault();
        const tab = window.open('', '_blank');
        if (tab) {
            tab.opener = null;
            tab.document.body.textContent = 'Loading file…';
        }
        this.ipfs.getDryRunFile(this.url || '').subscribe({
            next: (blob) => {
                if (tab?.closed) {
                    return;
                }
                const objectUrl = URL.createObjectURL(blob);
                if (tab) {
                    tab.location.href = objectUrl;
                } else {
                    window.open(objectUrl, '_blank', 'noopener,noreferrer');
                }
                setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
            },
            error: () => {
                tab?.close();
                this.toast.error('File not found');
            },
        });
    }
}
