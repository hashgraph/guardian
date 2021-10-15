import {Guardians} from '@helpers/guardians';
import {Users} from '@helpers/users';
import {VcHelper} from '@helpers/vcHelper';
import {KeyType, Wallet} from '@helpers/wallet';
import {Request, Response, Router} from 'express';
import {SchemaEntity, UserRole, UserState} from 'interfaces';
import {HederaHelper} from 'vc-modules';

/**
 * User profile route
 */
export const profileAPI = Router();

profileAPI.get('/user-balance', async (req: Request, res: Response) => {
    const users = new Users();
    const wallet = new Wallet();

    const user = await users.currentUser(req);
    if (!(await users.permission(user, [UserRole.INSTALLER, UserRole.ORIGINATOR]))) {
        console.log(user)
        res.status(403).send({code: 403, message: 'Forbidden'});
        return;
    }

    if (!user.hederaAccountId) {
        res.json('null');
        return;
    }

    const installerKey = await wallet.getKey(user.walletToken, KeyType.KEY, user.did);

    try {
        const balance = await HederaHelper
            .setOperator(user.hederaAccountId, installerKey).SDK
            .balance(user.hederaAccountId);
        res.json(balance);
    } catch (error) {
        res.json('null');
    }
});

profileAPI.get('/user-state', async (req: Request, res: Response) => {
    const guardians = new Guardians();
    const users = new Users();

    const user = await users.currentUser(req);
    if (!user) {
        res.status(500).json({code: 500, message: 'Bad user'});
        return;
    }


    let state = user.state;
    if (state == UserState.HEDERA_FILLED) {
        const didDocuments = await guardians.getDidDocuments({
            did: user.did
        });
        const didDocument = didDocuments[0];
        if (didDocument && didDocument.status == 'CREATE') {
            state = UserState.HEDERA_CONFIRMED;
        }
    }

    if (state == UserState.PROFILE_FILLED) {
        const vcDocuments = await guardians.getVcDocuments({
            owner: user.did,
            type: SchemaEntity.INSTALLER
        });
        const vcDocument = vcDocuments[0];
        if (vcDocument && vcDocument.status == 'ISSUE') {
            state = UserState.CONFIRMED;
        }
    }

    if (user.state != state) {
        user.state = state;
        await users.save(user);
    }

    res.json({
        username: user.username,
        did: user.did,
        state: user.state,
        role: user.role
    });
});

profileAPI.get('/', async (req: Request, res: Response) => {
    const guardians = new Guardians();
    const users = new Users();

    const user = await users.currentUser(req);
    if (!(await users.permission(user, [UserRole.INSTALLER, UserRole.ORIGINATOR]))) {
        res.status(403).send();
        return;
    }

    let didDocument: any, vcDocuments: any[];

    const index = {}
    index[UserState.CREATED] = 1;
    index[UserState.WALLET_FILLED] = 2;
    //
    index[UserState.HEDERA_FILLED] = 3;
    index[UserState.HEDERA_CONFIRMED] = 4;
    //
    index[UserState.PROFILE_FILLED] = 5;
    index[UserState.CONFIRMED] = 6;

    if (index[user.state] > 4) {
        const _vcDocuments = await guardians.getVcDocuments({
            owner: user.did,
            type: SchemaEntity.INSTALLER
        });
        vcDocuments = [];
        for (let i = 0; i < _vcDocuments.length; i++) {
            const vcDocument = _vcDocuments[i];
            if (vcDocument.status == 'ISSUE') {
                vcDocuments.push(vcDocument);
            }
        }
        if (!vcDocuments.length) {
            user.state = UserState.PROFILE_FILLED;
            vcDocuments = null;
        } else if (index[user.state] < 7) {
            user.state = UserState.CONFIRMED;
        }
    }

    if (index[user.state] > 2) {
        const didDocuments = await guardians.getDidDocuments({
            did: user.did
        });
        didDocument = didDocuments[0];

        if (!didDocument || didDocument.status != 'CREATE') {
            user.state = UserState.HEDERA_FILLED;
            didDocument = null;
        } else if (index[user.state] < 5) {
            user.state = UserState.HEDERA_CONFIRMED;
        }
    }

    const result = {
        username: user.username,
        did: user.did,
        state: user.state,
        role: user.role,
        walletToken: user.walletToken,
        hederaAccountId: user.hederaAccountId,
        didDocument: didDocument,
        vcDocuments: vcDocuments
    }

    res.json(result)
});

profileAPI.post('/set-hedera-profile', async (req: Request, res: Response) => {
    const guardians = new Guardians();
    const users = new Users();
    const wallet = new Wallet();

    try {
        const user = await users.currentUser(req);
        if (!(await users.permission(user, [UserRole.INSTALLER, UserRole.ORIGINATOR]))) {
            res.status(403).send();
            return;
        }

        const root = await guardians.getRootAddressBook()

        const {hederaAccountId, hederaAccountKey} = req.body;
        const hederaHelper = HederaHelper
            .setOperator(hederaAccountId, hederaAccountKey)
            .setAddressBook(root.addressBook, root.didTopic, root.vcTopic);

        const {hcsDid, did, document} = await hederaHelper.DID.createDid(hederaAccountKey);

        await users.updateCurrentUser(req, {
            did: did,
            hederaAccountId: hederaAccountId,
            state: UserState.HEDERA_FILLED
        });

        await wallet.setKey(user.walletToken, KeyType.KEY, did, hederaAccountKey);

        const result = await guardians.setDidDocument({did, document});

        hederaHelper.DID.createDidTransaction(hcsDid).then(function (message: any) {
            const did = message.getDid();
            const operation = message.getOperation();
            console.log(did, operation);
            guardians.setDidDocument({ did, operation });
        }, function (error) {
            console.error(error);
        });

        res.json(result);
    } catch (error) {
        res.status(500).json({code: 500, message: String(error)});
    }
});

profileAPI.get('/get-root-authority', async (req: Request, res: Response) => {
    const users = new Users();

    try {
        const rootAuthorities = await users.getUsersByRole(UserRole.ROOT_AUTHORITY);
        const map = rootAuthorities.map((e) => ({
            username: e.username,
            did: e.did
        }));
        res.status(200).json(map);
    } catch (error) {
        res.status(500).json({code: 500, message: String(error)});
    }
});

profileAPI.post('/set-vc-profile', async (req: Request, res: Response) => {
    const guardians = new Guardians();
    const users = new Users();
    const wallet = new Wallet();
    const vcHelper = new VcHelper();


    try {
        const user = await users.currentUser(req);
        if (!(await users.permission(user, [UserRole.INSTALLER, UserRole.ORIGINATOR]))) {
            res.status(403).send();
            return;
        }

        const {
            schema,
            options,
            rootAuthority,
            policyId,
        } = req.body;

        const schemaDocument: any = (await guardians.getSchemes({type: schema}))[0];
        if (!schemaDocument || schemaDocument.entity != SchemaEntity.INSTALLER) {
            res.status(500).json({code: 500, message: 'Invalid scheme'});
            return;
        }

        const installerDID = user.did;
        const installerKey = await wallet.getKey(user.walletToken, KeyType.KEY, installerDID);

        // did generation
        const installer = options;
        installer.id = installerDID;
        installer.policyId = policyId;

        const vc = await vcHelper.createCredential(installerDID, schema, installer);

        const documents = [{
            owner: installerDID,
            approver: rootAuthority,
            policyId: policyId,
            type: SchemaEntity.INSTALLER,
            document: vc
        }];

        await guardians.setApproveDocuments(documents);

        user.state = UserState.PROFILE_FILLED;
        await users.save(user);

        res.status(200).send(user);
    } catch (error) {
        console.log(error);
        res.status(500).json({code: 500, message: String(error)});
    }
});

profileAPI.get('/random-key', async (req: Request, res: Response) => {
    try {
        const OPERATOR_ID = process.env.OPERATOR_ID;
        const OPERATOR_KEY = process.env.OPERATOR_KEY;
        const treasury = await HederaHelper.setOperator(OPERATOR_ID, OPERATOR_KEY).SDK.newAccount(40);
        res.status(200).json({
            id: treasury.id.toString(),
            key: treasury.key.toString()
        });
    } catch (error) {
        res.status(500).json({code: 500, message: error});
    }
});
