import { Component, Input, SimpleChanges } from '@angular/core';
import { SettingsService } from 'src/app/services/settings.service';
import { environment } from 'src/environments/environment';

/**
 * Hedera explorer.
 */
@Component({
    selector: 'hedera-explorer',
    templateUrl: './hedera-explorer.component.html',
    styleUrls: ['./hedera-explorer.component.css']
})
export class HederaExplorer {
    url: string;

    @Input('type') type!: string;
    @Input('params') params!: string | null;

    constructor(private settingsService: SettingsService) {
        this.url = '';
    }

    ngOnChanges(changes: SimpleChanges): void {
        const networkMap: any = environment.explorerSettings.networkMap;
        const typeMap: any = environment.explorerSettings.typeMap;
        this.settingsService.getHederaNet().subscribe((res: string) => {
            this.url = environment.explorerSettings.url
                .replace('${network}', networkMap[res] || '')
                .replace('${type}', typeMap[this.type] || '')
                .replace('${value}', this.params || '');
        });
    }
}
