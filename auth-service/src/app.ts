import FastMQ from 'fastmq';
import {createConnection} from 'typeorm';
import { fixtures } from '@helpers/fixtures';
import { AccountService } from '@api/accountService';
import { WalletService } from '@api/walletService';

const PORT = process.env.PORT || 3002;

Promise.all([
    createConnection({
        type: 'mongodb',
        host: process.env.DB_HOST,
        database: process.env.DB_DATABASE,
        synchronize: true,
        logging: process.env.ENVIRONMENT !== 'production',
        useUnifiedTopology: true,
        entities: [
            'dist/entity/*.js'
        ],
        cli: {
            entitiesDir: 'dist/entity'
        }
    }),
    FastMQ.Client.connect(process.env.SERVICE_CHANNEL, 7500, process.env.MQ_ADDRESS)
]).then(async ([db, channel]) => {
    await fixtures();

    new AccountService(channel);
    new WalletService(channel);

    console.log('auth service started');
});
