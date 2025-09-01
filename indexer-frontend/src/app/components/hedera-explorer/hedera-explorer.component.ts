import { Component, Input, SimpleChanges } from '@angular/core';
import { SettingsService } from '@services/settings.service';
import { environment } from '../../../environments/environment';
import { NetworkExplorerSettings } from '@indexer/interfaces';

export enum HederaType {
    TRANSACTION = 'transaction',
    ACCOUNT = 'account',
    TOPIC = 'topic',
    TOKEN = 'token',
}

/**
 * Hedera explorer.
 */
@Component({
    selector: 'hedera-explorer',
    standalone: true,
    templateUrl: './hedera-explorer.component.html',
    styleUrls: ['./hedera-explorer.component.scss']
})
export class HederaExplorer {
    url: string;

    @Input('type') type!: string;
    @Input('params') params!: string | null;
    @Input('subType') subType!: string;
    @Input('subParams') subParams!: string | null;

    constructor(private settingsService: SettingsService) {
        this.url = '';
    }

    ngOnChanges(changes: SimpleChanges): void {
        this.settingsService.getHederaNetExplorer().subscribe((res: NetworkExplorerSettings | null) => {
            if (res) {
                const type = this.type ? ('/' + this.type) : '';
                const params = this.params ? ('/' + this.params) : '';
                const subType = this.subType ? ('/' + this.subType) : '';
                const subParams = this.subParams ? ('/' + this.subParams) : '';

                this.url = res.networkExplorerLink
                    .replace('/${type}', type)
                    .replace('/${value}', params)
                    .replace('/${subType}', subType)
                    .replace('/${subValue}', subParams);
            }
        });
    }
}
