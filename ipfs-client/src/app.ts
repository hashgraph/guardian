import { NFTStorage } from 'nft.storage';
import { MessageBrokerChannel, Logger, ApiServer } from '@guardian/common';
import { fileAPI } from './api/file.service';
import { Settings } from './entity/settings';
import { Connection } from 'typeorm';

const PORT = parseInt(process.env.PORT) || 3006;

(async () => {
    const server = new ApiServer({
        port: PORT,
        name: 'IPFS_CLIENT',
        channelName: 'ipfs-client',
        requireDB: true,
        entities: [Settings],
        onReady: async (db: Connection, channel: MessageBrokerChannel) => {
            const settingsRepository = db.getMongoRepository(Settings);
            const nftApiKey = await settingsRepository.findOne({
                name: "NFT_API_KEY"
            });
            await fileAPI(channel, new NFTStorage({ token: nftApiKey?.value || process.env.NFT_API_KEY }), settingsRepository);
            new Logger().setChannel(channel);
            new Logger().info('ipfs-client service started', ['IPFS_CLIENT']);
        }
    });

    await server.start();
})();