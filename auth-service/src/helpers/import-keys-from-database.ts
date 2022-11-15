import { WalletAccount } from '@entity/wallet-account';
import { DataBaseHelper, Logger } from '@guardian/common';
import { IVault } from '../vaults';

/**
 * Migration function
 * @constructor
 */
export async function ImportKeysFromDatabase(vault: IVault): Promise<void> {
    const logger = new Logger();

    if (process.env.VAULT_PROVIDER === 'database') {
        logger.error('Cannot import to database provider', ['AUTH_SERVICE']);
        return;
    }

    const re = /^.*KEY\|(.+)$/;

    logger.info('Start import keys', ['AUTH_SERVICE']);
    const walletRepository = new DataBaseHelper(WalletAccount)
    const databaseWallets = await walletRepository.find({
        type: re
    });
    const walletAccounts = databaseWallets.map(w => {
        return {
            value: w.key,
            token: w.token,
            type: 'KEY',
            key: re.exec(w.type)[1]
        }
    })

    logger.info(`found ${walletAccounts.length} keys`, ['AUTH_SERVICE']);

    try {
        for (const {token, type, key, value} of walletAccounts) {
            await vault.setKey(token, type, key, value);
        }
        logger.info(`${walletAccounts.length} keys was added to ${vault.constructor.name.toUpperCase()}`, ['AUTH_SERVICE']);
    } catch (e) {
        logger.error(`${vault.constructor.name.toUpperCase()} vault import error: ${e.message}`, ['AUTH_SERVICE']);
    }

}
