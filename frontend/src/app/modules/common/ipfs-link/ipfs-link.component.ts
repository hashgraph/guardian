import { Component, Input, OnChanges } from '@angular/core';
import { IPFSService } from 'src/app/services/ipfs.service';
import { ToastService } from 'src/app/services/toast.service';
import { ipfsCid } from 'src/app/utils/ipfs-file';
import { openIpfsFile } from 'src/app/utils/open-ipfs-file';

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

    public cid = '';

    public ngOnChanges(): void {
        this.cid = ipfsCid(this.url);
    }

    public openFile(): void {
        openIpfsFile(this.ipfs, this.toast, this.url || '', this.dryRun);
    }
}
