import { Guardians } from '@helpers/guardians';
import { Users } from '@helpers/users';
import { VcHelper } from '@helpers/vcHelper';
import { Request, Response, Router } from 'express';
import { SchemaEntity, UserRole, UserState } from 'interfaces';
import { HcsVcDocument, HederaHelper, VcSubject } from 'vc-modules';

async function wait(s: number): Promise<void> {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve();
        }, s * 1000);
    })
}

/**
 * Root config route
 */
export const rootAPI = Router();

rootAPI.get('/root-balance', async (req: Request, res: Response) => {
    const guardians = new Guardians();
    const users = new Users();

    const user = await users.currentUser(req);
    if (!(await users.permission(user, UserRole.ROOT_AUTHORITY))) {
        res.status(403).send({ code: 403, message: 'Forbidden' });
        return;
    }

    try {
        const root = await guardians.getRootConfig(user.did);
        const balance = await HederaHelper
            .setOperator(root.hederaAccountId, root.hederaAccountKey).SDK
            .balance(root.hederaAccountId);
        res.json(balance);
    } catch (error) {
        res.json('null');
    }
});

rootAPI.get('/root-config', async (req: Request, res: Response) => {
    const guardians = new Guardians();
    const users = new Users();

    const user = await users.currentUser(req);
    if (!(await users.permission(user, UserRole.ROOT_AUTHORITY))) {
        res.status(403).send({ code: 403, message: 'Forbidden' });
        return;
    }
    if (!users.status(user, UserState.CONFIRMED)) {
        res.status(500).send({ code: 500, message: 'Server error' });
        return;
    }

    const root = await guardians.getRootConfig(user.did);
    res.json(root)
});

rootAPI.post('/set-root-config', async (req: Request, res: Response) => {
    const guardians = new Guardians();
    const users = new Users();
    const vcHelper = new VcHelper();

    const user = await users.currentUser(req);
    if (!(await users.permission(user, UserRole.ROOT_AUTHORITY))) {
        res.status(403).send();
        return;
    }

    const data = req.body;
    const { hederaAccountId, hederaAccountKey } = data;

    let rootObject: any,
        did: string,
        document: any,
        vc: HcsVcDocument<VcSubject>,
        hcsDid: any;
    try {
        const hederaConnection = await HederaHelper
            .newNetwork(
                hederaAccountId,
                hederaAccountKey,
                data.appnetName,
                data.didServerUrl,
                data.didTopicMemo,
                data.vcTopicMemo,
            );

        await wait(15);

        const hederaHelper = HederaHelper
            .setOperator(hederaAccountId, hederaAccountKey)
            .setAddressBook(
                hederaConnection.addressBookId,
                hederaConnection.didTopicId,
                hederaConnection.vcTopicId,
            );

        const res = await hederaHelper.DID.createDid(data.hederaAccountKey);
        data.vc.id = res.did;
        vc = await vcHelper.createVC(res.did, data.hederaAccountKey, null, data.vc);

        hcsDid = res.hcsDid;
        did = res.did;
        document = res.document;
        rootObject = {
            hederaAccountId: hederaAccountId,
            hederaAccountKey: hederaAccountKey,
            addressBook: hederaConnection.addressBookId,
            didTopic: hederaConnection.didTopicId,
            vcTopic: hederaConnection.vcTopicId,
            appnetName: data.appnetName,
            didServerUrl: data.didServerUrl,
            didTopicMemo: data.didTopicMemo,
            vcTopicMemo: data.vcTopicMemo,
            did: did,
            state: 1
        };
    } catch (error) {
        console.error(error);
        res.status(500).send(error.message);
        return;
    }

    let result;
    try {
        result = await guardians.setVcDocument({
            hash: vc.toCredentialHash(),
            owner: did,
            document: vc.toJsonTree(),
            type: SchemaEntity.ROOT_AUTHORITY
        });
        result = await guardians.setRootConfig(rootObject);
        result = await guardians.setDidDocument({ did, document });
        result = await users.updateCurrentUser(req, {
            did: did,
            state: UserState.CONFIRMED
        });

        const hederaHelper = HederaHelper
            .setOperator(hederaAccountId, hederaAccountKey)
            .setAddressBook(
                rootObject.addressBook,
                rootObject.didTopic,
                rootObject.vcTopic,
            );

        hederaHelper.DID.createVcTransaction(vc, hederaAccountKey).then(function (message: any) {
            const hash = message.getCredentialHash();
            const operation = message.getOperation();
            guardians.setVcDocument({ hash, operation });
        }, function (error: any) {
            console.error(error);
        });

        hederaHelper.DID.createDidTransaction(hcsDid).then(function (message: any) {
            const did = message.getDid();
            const operation = message.getOperation();
            guardians.setDidDocument({ did, operation });
        }, function (error: any) {
            console.error(error);
        });
    } catch (error) {
        console.error(error);
        res.status(500).send(error.message);
        return;
    }

    res.json(result);
});