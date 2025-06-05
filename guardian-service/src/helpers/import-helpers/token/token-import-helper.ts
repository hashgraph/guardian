import { Token } from '@guardian/common';
import { IOwner } from '@guardian/interfaces';
import { INotifier } from '../../notifier.js';
import { ImportTokenResult } from './token-import.interface.js';
import { TokenImport } from './token-import.js';
import { ImportMode } from '../common/import.interface.js';

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
    notifier: INotifier
): Promise<ImportTokenResult> {
    const tokenImport = new TokenImport(mode, notifier);
    return await tokenImport.import(tokens, user);
}