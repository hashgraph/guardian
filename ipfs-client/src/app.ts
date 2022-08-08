import { ApplicationStates } from '@guardian/interfaces';
import { NFTStorage } from 'nft.storage';
import { MessageBrokerChannel, ApplicationState, Logger, DB_DI, DataBaseHelper, Migration } from '@guardian/common';
import { fileAPI } from './api/file.service';
import { Settings } from './entity/settings';
import { MikroORM } from '@mikro-orm/core';
import { MongoDriver } from '@mikro-orm/mongodb';

const connectionConfig: any = {
    type: 'mongo',
    dbName: process.env.DB_DATABASE,
    clientUrl:`mongodb://${process.env.DB_HOST}`,
    entities: [
        'dist/entity/*.js'
    ]
};

Promise.all([
    Migration({
        ...connectionConfig,
        migrations: {
            path: 'dist/migrations'
        }
    }),
    MikroORM.init<MongoDriver>({
        ...connectionConfig,
        driverOptions: {
            useUnifiedTopology: true
        },
        ensureIndexes: true
    }),
    MessageBrokerChannel.connect('IPFS_CLIENT')
]).then(async values => {
    const [_, db, cn] = values;
    DB_DI.orm = db;
    const state = new ApplicationState('IPFS_CLIENT');
    const channel = new MessageBrokerChannel(cn, 'ipfs-client');

    new Logger().setChannel(channel);
    state.setChannel(channel);

    // Check configuration
    if (!process.env.NFT_API_KEY || process.env.NFT_API_KEY.length < 20) {
        await new Logger().error('You need to fill NFT_API_KEY field in .env file', ['IPFS_CLIENT']);
        throw new Error('You need to fill NFT_API_KEY field in .env file');
    }
    ///////////////

    state.updateState(ApplicationStates.STARTED);
    const settingsRepository = new DataBaseHelper(Settings);
    const nftApiKey = await settingsRepository.findOne({
        name: 'NFT_API_KEY'
    });

    state.updateState(ApplicationStates.INITIALIZING);
    await fileAPI(channel, new NFTStorage({ token: nftApiKey?.value || process.env.NFT_API_KEY }), settingsRepository);

    state.updateState(ApplicationStates.READY);
    new Logger().info('ipfs-client service started', ['IPFS_CLIENT']);
})
