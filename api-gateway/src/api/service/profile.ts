import { Guardians } from '@helpers/guardians';
import { Users } from '@helpers/users';
import { KeyType, Wallet } from '@helpers/wallet';
import { Request, Response, Router } from 'express';
import { DidDocumentStatus, IUser, SchemaEntity, UserRole } from 'interfaces';

/**
 * User profile route
 */
export const profileAPI = Router();

profileAPI.get('/:username/', async (req: Request, res: Response) => {
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
        res.status(500).json({ code: 500, message: error.message });
    }
});

profileAPI.put('/:username/', async (req: Request, res: Response) => {
    try {
        const users = new Users();
        const wallet = new Wallet();
        const guardians = new Guardians();

        const profile: IUser = req.body;
        const user = await users.currentUser(req);

        if (!profile.hederaAccountId) {
            res.status(403).json({ code: 403, message: 'Invalid Hedera Account Id' });
            return;
        }
        if (!profile.hederaAccountKey) {
            res.status(403).json({ code: 403, message: 'Invalid Hedera Account Key' });
            return;
        }

        let did: string;
        if (user.role === UserRole.ROOT_AUTHORITY) {
            if (!profile.addressBook) {
                res.status(403).json({ code: 403, message: 'Invalid Address Book' });
                return;
            }
            did = await guardians.createRootAuthorityProfile(profile);
        } else if (user.role === UserRole.USER) {
            did = await guardians.createUserProfile(profile);
        }

        await users.updateCurrentUser(req, {
            did: did,
            hederaAccountId: profile.hederaAccountId
        });

        await wallet.setKey(user.walletToken, KeyType.KEY, did, profile.hederaAccountKey);

        res.status(200).json(null);
    } catch (error) {
        console.error(error);
        res.status(500).json({ code: 500, message: error.message });
    }
});

profileAPI.get('/:username/balance', async (req: Request, res: Response) => {
    try {
        const guardians = new Guardians();
        const balance = await guardians.getUserBalance(req.params.username);
        res.json(balance);
    } catch (error) {
        console.error(error);
        res.json('null');
    }
});