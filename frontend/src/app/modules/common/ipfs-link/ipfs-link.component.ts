import { Component, Input, OnChanges } from '@angular/core';
import { ipfsCid, ipfsGatewayLink } from 'src/app/utils/ipfs-file';

@Component({
    selector: 'ipfs-link',
    templateUrl: './ipfs-link.component.html',
    styleUrls: ['./ipfs-link.component.scss'],
    standalone: false
})
export class IPFSLinkComponent implements OnChanges {
    @Input() url: string | undefined;

    public link = '';
    public cid = '';

    public ngOnChanges(): void {
        this.link = ipfsGatewayLink(this.url || '');
        this.cid = ipfsCid(this.url);
    }
}
