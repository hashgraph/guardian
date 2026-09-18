import { IVault } from './vault.interface.js';
import * as vaultProviders from './vault-providers/index.js'
import assert from 'node:assert';

/**
 * Vault service factory
 * @constructor
 * @param providerName
 */
export async function InitializeVault(providerName: string): Promise<IVault> {
    let constructor: new () => IVault;
    for (const [name, c] of Object.entries(vaultProviders)) {
        if (providerName.toLowerCase() === name.toLowerCase()) {
            constructor = c;
            break;
        }
    }
    assert(constructor, `Provider '${providerName}' was not registered`);

    const v = new constructor();
    await v.init();

    return v;
}
