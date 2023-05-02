import { Component, Input, SimpleChanges } from '@angular/core';
import { SettingsService } from 'src/app/services/settings.service';
import { environment } from 'src/environments/environment';

/**
 * Hedera explorer.
 */
@Component({
    selector: 'file-explorer',
    templateUrl: './file-explorer.component.html',
    styleUrls: ['./file-explorer.component.css']
})
export class FileExplorer {
    url: string;

    @Input('type') type!: string;
    @Input('params') params!: string | null;

    constructor(private settingsService: SettingsService) {
        this.url = '';
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (this.type === 'ipfs' && typeof this.params === 'string') {
            const cid = this.params.startsWith('ipfs://') ? this.params.substring(7) : this.params;
            this.url = `https://ipfs.io/ipfs/${cid}`;
        } else {
            this.url = '';
        }
    }
}
