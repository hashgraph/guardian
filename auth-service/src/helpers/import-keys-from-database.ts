import { WalletAccount } from '../entity/wallet-account.js';
import { DatabaseServer, PinoLogger } from '@guardian/common';
import { IVault } from '../vaults/index.js';

/**
 * Migration function
 * @constructor
 */
export async function ImportKeysFromDatabase(vault: IVault, logger: PinoLogger): Promise<void> {
    if (process.env.VAULT_PROVIDER === 'database') {
        await logger.error('Cannot import to database provider', ['AUTH_SERVICE'], null);
        return;
    }

    const re = /^(.*KEY)\|(.+)$/;

    await logger.info('Start import keys', ['AUTH_SERVICE'], null);
    const walletRepository = new DatabaseServer()
    const databaseWallets = await walletRepository.find(WalletAccount, {
        type: re
    });
    const walletAccounts = databaseWallets.map(w => {
        return {
            value: w.key,
            token: w.token,
            type: re.exec(w.type)[1],
            key: re.exec(w.type)[2]
        }
    })

    await logger.info(`found ${walletAccounts.length} keys`, ['AUTH_SERVICE'], null);

    try {
        for (const { token, type, key, value } of walletAccounts) {
            await vault.setKey(token, type, key, value);
        }
        await logger.info(`${walletAccounts.length} keys was added to ${vault.constructor.name.toUpperCase()}`, ['AUTH_SERVICE'], null);
    } catch (e) {
        await logger.error(`${vault.constructor.name.toUpperCase()} vault import error: ${e.message}`, ['AUTH_SERVICE'], null);
    }

}
