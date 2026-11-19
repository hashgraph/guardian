import { Component, Input } from '@angular/core';
import { IPFSService } from 'src/app/services/ipfs.service';
import { ToastService } from 'src/app/services/toast.service';
import { openIpfsFile } from 'src/app/utils/open-ipfs-file';

/**
 * Hedera explorer.
 */
@Component({
    selector: 'file-explorer',
    templateUrl: './file-explorer.component.html',
    styleUrls: ['./file-explorer.component.css'],
    standalone: false
})
export class FileExplorer {
    @Input('type') type!: string;
    @Input('params') params!: string | null;

    constructor(private ipfs: IPFSService, private toast: ToastService) {}

    public openFile(event: Event): void {
        if (this.type === 'ipfs' && typeof this.params === 'string') {
            event.preventDefault();
            openIpfsFile(this.ipfs, this.toast, this.params);
        }
    }
}
