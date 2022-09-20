import { IVault } from './vault.interface';


/**
 * Vault service factory
 * @param constructor Vault service constructor
 * @constructor
 */
export async function InitializeVault(constructor: new () => IVault): Promise<IVault> {
    const v = new constructor();
    await v.init();

    return v;
}
