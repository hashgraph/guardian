import { Token } from '@guardian/common';
import { IOwner } from '@guardian/interfaces';
import { INotifier } from '../../notifier.js';
import { ImportTokenResult } from './token-import.interface.js';
import { TokenImport } from './token-import.js';
import { ImportMode } from '../common/import.interface.js';
import { INotificationStep } from '../../new-notifier.js';

/**
 * Import tokens by files
 * @param owner
 * @param messages
 * @param notifier
 */
export async function importTokensByFiles(
    user: IOwner,
    tokens: Token[] = [],
    mode: ImportMode,
    notifier: INotificationStep,
    userId: string | null
): Promise<ImportTokenResult> {
    notifier.start();
    const tokenImport = new TokenImport(mode, notifier);
    const result = await tokenImport.import(tokens, user);
    notifier.complete();
    return result;
}