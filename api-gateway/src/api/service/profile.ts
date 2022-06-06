import { AuthenticatedRequest } from '@auth/auth.interface';
import { Guardians } from '@helpers/guardians';
import { Users } from '@helpers/users';
import { KeyType, Wallet } from '@helpers/wallet';
import { Request, Response, Router } from 'express';
import { DidDocumentStatus, IUser, SchemaEntity, TopicType, UserRole } from '@guardian/interfaces';

/**
 * User profile route
 */
export const profileAPI = Router();

profileAPI.get('/:username/', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const guardians = new Guardians();
        const users = new Users();

        const user = await users.getUser(req.user.username);

        let didDocument: any = null;
        if (user.did) {
            const didDocuments = await guardians.getDidDocuments({ did: user.did });
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

        let topic: any;
        if (user.did || user.parent) {
            const filters = [];
            if(user.did) {
                filters.push(user.did);
            }
            if(user.parent) {
                filters.push(user.parent);
            }
            topic = await guardians.getTopic({
                type: TopicType.UserTopic,
                owner: { $in: filters }
            });
        }

        const result: IUser = {
            username: user.username,
            role: user.role,
            did: user.did,
            parent: user.parent,
            hederaAccountId: user.hederaAccountId,
            confirmed: !!(didDocument && didDocument.status == DidDocumentStatus.CREATE),
            failed: !!(didDocument && didDocument.status == DidDocumentStatus.FAILED),
            hederaAccountKey: null,
            topicId: topic?.topicId,
            didDocument: didDocument,
            vcDocument: vcDocument
        };
        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ code: error.code, message: error.message });
    }
});

profileAPI.put('/:username/', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const users = new Users();
        const wallet = new Wallet();
        const guardians = new Guardians();

        const profile: any = req.body;
        const user = await users.getUser(req.user.username);

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
            profile.entity = SchemaEntity.ROOT_AUTHORITY;
            did = await guardians.createRootAuthorityProfile(profile);
        } else if (user.role === UserRole.USER) {
            did = await guardians.createUserProfile(profile);
        }

        await users.updateCurrentUser(req, {
            did: did,
            parent: profile.parent,
            hederaAccountId: profile.hederaAccountId
        });

        await wallet.setKey(user.walletToken, KeyType.KEY, did, profile.hederaAccountKey);

        res.status(200).json(null);
    } catch (error) {
        console.error(error);
        res.status(500).json({ code: error.code || 500, message: error.message });
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
