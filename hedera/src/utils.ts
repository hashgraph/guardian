import { PrivateKey, PublicKey } from '@hiero-ledger/sdk';

export function checkHederaKey(privateKey: string, publicKey: string): boolean {
    try {
        const _privateKey = PrivateKey.fromStringDer(privateKey);
        const _publicKey = _privateKey.publicKey;
        const _infoKey = PublicKey.fromString(publicKey);
        return _publicKey.equals(_infoKey);
    } catch (error) {
        return false;
    }
}
