import { Guardians } from '@helpers/guardians';
import { Users } from '@helpers/users';
import { VcHelper } from '@helpers/vcHelper';
import { KeyType, Wallet } from '@helpers/wallet';
import { Request, Response, Router } from 'express';
import { DidDocumentStatus, IUser, SchemaEntity, UserRole } from 'interfaces';
import { HederaHelper } from 'vc-modules';

async function wait(s: number): Promise<void> {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve();
        }, s * 1000);
    })
}

async function createUserProfile(profile: IUser) {
    const guardians = new Guardians();

    const addressBook = await guardians.getRootAddressBook();
    const hederaHelper = HederaHelper
        .setOperator(profile.hederaAccountId, profile.hederaAccountKey)
        .setAddressBook(addressBook.addressBook, addressBook.didTopic, addressBook.vcTopic);

    const { hcsDid, did, document } = await hederaHelper.DID.createDid(profile.hederaAccountKey);

    await guardians.setDidDocument({ did, document });

    hederaHelper.DID.createDidTransaction(hcsDid).then(function (message: any) {
        const did = message.getDid();
        const operation = message.getOperation();
        guardians.setDidDocument({ did, operation });
    }, function (error) {
        console.error('createDidTransaction:', error);
        guardians.setDidDocument({ did, operation: DidDocumentStatus.FAILED });
    });

    return did;
}

async function createRootAuthorityProfile(profile: IUser) {
    const guardians = new Guardians();
    const vcHelper = new VcHelper();

    const addressBook = await HederaHelper
        .newNetwork(
            profile.hederaAccountId,
            profile.hederaAccountKey,
            profile.addressBook.appnetName,
            profile.addressBook.didServerUrl,
            profile.addressBook.didTopicMemo,
            profile.addressBook.vcTopicMemo,
        );

    await wait(15);

    const hederaHelper = HederaHelper
        .setOperator(profile.hederaAccountId, profile.hederaAccountKey)
        .setAddressBook(
            addressBook.addressBookId,
            addressBook.didTopicId,
            addressBook.vcTopicId,
        );

    const { hcsDid, did, document } = await hederaHelper.DID.createDid(profile.hederaAccountKey);

    const vc: any = profile.vcDocument || {};
    vc.id = did;

    const vcDocument = await vcHelper.createVC(did, profile.hederaAccountKey, vc);

    await guardians.setVcDocument({
        hash: vcDocument.toCredentialHash(),
        owner: did,
        document: vcDocument.toJsonTree(),
        type: SchemaEntity.ROOT_AUTHORITY
    });

    await guardians.setRootConfig({
        hederaAccountId: profile.hederaAccountId,
        hederaAccountKey: profile.hederaAccountKey,
        addressBook: addressBook.addressBookId,
        didTopic: addressBook.didTopicId,
        vcTopic: addressBook.vcTopicId,
        appnetName: profile.addressBook.appnetName,
        didServerUrl: profile.addressBook.didServerUrl,
        didTopicMemo: profile.addressBook.didTopicMemo,
        vcTopicMemo: profile.addressBook.vcTopicMemo,
        did: did,
        state: 1
    });

    await guardians.setDidDocument({ did, document });

    hederaHelper.DID.createVcTransaction(vcDocument, profile.hederaAccountKey).then(function (message: any) {
        const hash = message.getCredentialHash();
        const operation = message.getOperation();
        guardians.setVcDocument({ hash, operation });
    }, function (error: any) {
        console.error("createVcTransaction:", error);
    });

    hederaHelper.DID.createDidTransaction(hcsDid).then(function (message: any) {
        const did = message.getDid();
        const operation = message.getOperation();
        guardians.setDidDocument({ did, operation });
    }, function (error: any) {
        console.error('createDidTransaction:', error);
        guardians.setDidDocument({ did, operation: DidDocumentStatus.FAILED });
    });

    await wait(15);

    return did;
}

/**
 * User profile route
 */
export const profileAPI = Router();

profileAPI.get('/', async (req: Request, res: Response) => {
    try {
        const guardians = new Guardians();
        const users = new Users();

        const user = await users.currentUser(req);

        let didDocument: any = null;
        if (user.did) {
            const didDocuments = await guardians.getDidDocuments({
                did: user.did
            });
            if (didDocuments) {
                didDocument = didDocuments[didDocuments.length - 1];
            }
        }

        let vcDocument: any = null;
        if (user.did) {
            const vcDocuments = await guardians.getVcDocuments({
                owner: user.did,
                type: SchemaEntity.ROOT_AUTHORITY
            });
            if (vcDocuments) {
                vcDocument = vcDocuments[vcDocuments.length - 1];
            }
        }

        let addressBook: any = null;
        if (user.role === UserRole.ROOT_AUTHORITY) {
            const root = await guardians.getRootConfig(user.did);
            if (root) {
                addressBook = {
                    appnetName: root.appnetName,
                    addressBook: root.addressBook,
                    didTopic: root.didTopic,
                    vcTopic: root.vcTopic,
                    didServerUrl: root.didServerUrl,
                    didTopicMemo: root.didTopicMemo,
                    vcTopicMemo: root.vcTopicMemo,
                }
            }
        }

        const result: IUser = {
            confirmed: !!(didDocument && didDocument.status == DidDocumentStatus.CREATE),
            failed: !!(didDocument && didDocument.status == DidDocumentStatus.FAILED),
            username: user.username,
            role: user.role,
            hederaAccountId: user.hederaAccountId,
            hederaAccountKey: null,
            did: user.did,
            didDocument: didDocument,
            vcDocument: vcDocument,
            addressBook: addressBook
        };
        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ code: 500, message: error });
    }
});

profileAPI.put('/', async (req: Request, res: Response) => {
    try {
        const users = new Users();
        const wallet = new Wallet();

        const profile: IUser = req.body;
        const user = await users.currentUser(req);

        if (!profile.hederaAccountId) {
            res.status(500).json({ code: 403, message: 'Invalid Hedera Account Id' });
            return;
        }
        if (!profile.hederaAccountKey) {
            res.status(500).json({ code: 403, message: 'Invalid Hedera Account Key' });
            return;
        }

        let did: string;
        if (user.role === UserRole.ROOT_AUTHORITY) {
            if (!profile.addressBook) {
                res.status(500).json({ code: 403, message: 'Invalid Address Book' });
                return;
            }
            did = await createRootAuthorityProfile(profile);
        } else if (user.role === UserRole.USER) {
            did = await createUserProfile(profile);
        }

        await users.updateCurrentUser(req, {
            did: did,
            hederaAccountId: profile.hederaAccountId
        });

        await wallet.setKey(user.walletToken, KeyType.KEY, did, profile.hederaAccountKey);

        res.status(200).json(null);
    } catch (error) {
        console.error(error);
        res.status(500).json({ code: 500, message: error });
    }
});

profileAPI.get('/balance', async (req: Request, res: Response) => {
    try {
        const users = new Users();
        const wallet = new Wallet();

        const user = await users.currentUser(req);
        if (!user.hederaAccountId) {
            res.json('Invalid Hedera Account Id');
            return;
        }

        const key = await wallet.getKey(user.walletToken, KeyType.KEY, user.did);

        const balance = await HederaHelper
            .setOperator(user.hederaAccountId, key).SDK
            .balance(user.hederaAccountId);
        res.json(balance);
    } catch (error) {
        console.error(error);
        res.json('null');
    }
});

