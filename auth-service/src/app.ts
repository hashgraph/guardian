import { fixtures } from '@helpers/fixtures';
import { AccountService } from '@api/accountService';
import { WalletService } from '@api/walletService';
import { ApiServer, MessageBrokerChannel, Logger } from '@guardian/common';
import { User } from '@entity/user';
import { WalletAccount } from '@entity/wallet-account';
import { Connection } from 'typeorm';

const PORT = parseInt(process.env.PORT, 10) || 3003;

(async () => {
    const server = new ApiServer({
        port: PORT,
        name: 'AUTH_SERVICE',
        channelName: 'auth-service',
        requireDB: true,
        entities: [User, WalletAccount],
        onReady: async (db: Connection, channel: MessageBrokerChannel) => {
            const userRepository = db.getMongoRepository(User)
            const walletAccountRepository = db.getMongoRepository(WalletAccount)
            await fixtures();
            new AccountService(channel);
            new WalletService(channel);
            new Logger().setChannel(channel);
        }
    });

    await server.start();
})();