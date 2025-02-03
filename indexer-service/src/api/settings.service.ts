import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import {
    AnyResponse,
    IndexerMessageAPI,
    MessageResponse,
} from '@indexer/common';
import escapeStringRegexp from 'escape-string-regexp';
import { NetworkExplorerSettings } from '@indexer/interfaces';

function createRegex(text: string) {
    return {
        $regex: `.*${escapeStringRegexp(text).trim()}.*`,
        $options: 'si',
    }
}

@Controller()
export class SettingsService {
    @MessagePattern(IndexerMessageAPI.GET_NETWORK)
    async getNetworkExplorer(): Promise<AnyResponse<string>> {
        return new MessageResponse<string>(process.env.HEDERA_NET);
    }

    @MessagePattern(IndexerMessageAPI.GET_NETWORK_EXPLORER)
    async getNetworkExplorerSettings(): Promise<AnyResponse<NetworkExplorerSettings>> {
        return new MessageResponse<NetworkExplorerSettings>({
            networkExplorerLink: process.env.HEDERA_EXPLORER_LINK?.replace('${network}', process.env.HEDERA_NET),
        });
    }
}
