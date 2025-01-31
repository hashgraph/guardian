import { Component, Input, SimpleChanges } from '@angular/core';
import { API_IPFS_GATEWAY_URL, IPFS_SCHEMA } from 'src/app/services/api';

@Component({
    selector: 'ipfs-link',
    templateUrl: './ipfs-link.component.html',
    styleUrls: ['./ipfs-link.component.scss']
})
export class IPFSLinkComponent {
    @Input('url') url: string | undefined;

    public link:string;

    constructor() {
    }

    ngOnChanges(changes: SimpleChanges): void {
        this.link = '';
        if(this.url) {
            debugger;
            if(this.url.startsWith(IPFS_SCHEMA)) {
                this.link = API_IPFS_GATEWAY_URL + this.url.replace(IPFS_SCHEMA, '');
            } else {
                this.link = this.url;
            }
        }
    }
}
