import FastMQ from 'fastmq';
import { Logger } from 'logger-helper';
import { NFTStorage } from 'nft.storage';
import { createConnection } from 'typeorm';
import { fileAPI } from './api/file.service';
import { Settings } from './entity/settings';

const PORT = process.env.PORT || 3006;

Promise.all([
    createConnection({
        type: 'mongodb',
        host: process.env.DB_HOST,
        database: process.env.DB_DATABASE,
        synchronize: true,
        logging: true,
        useUnifiedTopology: true,
        entities: [
            'dist/entity/*.js'
        ],
        cli: {
            entitiesDir: 'dist/entity'
        }
    }),
    FastMQ.Client.connect(process.env.SERVICE_CHANNEL, 7500, process.env.MQ_ADDRESS),
]).then(async values => {
    const [db, channel] = values;

    const settingsRepository = db.getMongoRepository(Settings);
    const nftApiKey = await settingsRepository.findOne({
        name: "NFT_API_KEY"
    });

    new Logger().setChannel(channel);
    await fileAPI(channel, new NFTStorage({ token: nftApiKey?.value || process.env.NFT_API_KEY }), settingsRepository);

    new Logger().info('ipfs-client service started', ['IPFS_CLIENT']);
    console.log('ipfs-client service started');
})
