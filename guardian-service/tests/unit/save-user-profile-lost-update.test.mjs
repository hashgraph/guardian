import assert from 'node:assert/strict';
import sinon from 'sinon';
import { DidDocumentStatus, UserRole } from '@guardian/interfaces';
import { Users } from '@guardian/common/helpers/users';
import { Wallet } from '@guardian/common/helpers/wallet';
import { DatabaseServer } from '@guardian/common/database-modules/database-server';
import { saveUserProfile } from '../../dist/api/helpers/profile-helper.js';

// Onboarding writes the DID document and then links it to the user through the auth service. When
// that update fails or its reply is lost, the DID must not be left looking valid with no user
// pointing at it: either the update did land (go on) or the DID is marked failed (and the task fails).
describe('saveUserProfile when the user update does not answer', () => {
    const did = 'did:hedera:localnode:abc_0.0.10';
    const timeout = Object.assign(new Error('Timeout exceed (auth-UPDATE_USER)'), { code: 'REQUEST_TIMEOUT' });
    const notifier = { startStep() {}, completeStep() {}, complete() {} };
    let didRow;
    let updatedRows;
    let walletKeys;

    const save = () => saveUserProfile({
        username: 'alice',
        did,
        profile: { parent: 'did:parent', hederaAccountId: '0.0.7', hederaAccountKey: 'key' },
        notifier,
        user: { id: 'u-1', role: UserRole.STANDARD_REGISTRY, walletToken: 'w' },
        logger: { error: async () => undefined },
        logId: null,
    });

    beforeEach(() => {
        didRow = { did, status: DidDocumentStatus.CREATE };
        updatedRows = [];
        walletKeys = [];
        sinon.stub(DatabaseServer.prototype, 'getDidDocument').callsFake(async () => didRow);
        sinon.stub(DatabaseServer.prototype, 'update').callsFake(async (_entity, _filter, row) => {
            updatedRows.push({ ...row });
            return row;
        });
        sinon.stub(Wallet.prototype, 'setKey').callsFake(async (_token, type, keyDid) => {
            walletKeys.push(keyDid);
        });
    });

    afterEach(() => {
        sinon.restore();
    });

    it('marks the DID failed and fails when the user does not point at it', async () => {
        sinon.stub(Users.prototype, 'updateCurrentUser').rejects(timeout);
        sinon.stub(Users.prototype, 'getUser').resolves({ username: 'alice', did: null });

        await assert.rejects(save(), (error) => error === timeout);

        assert.deepEqual(updatedRows.map((row) => row.status), [DidDocumentStatus.FAILED]);
        assert.deepEqual(walletKeys, []);
    });

    it('goes on when the update landed and only its reply was lost', async () => {
        sinon.stub(Users.prototype, 'updateCurrentUser').rejects(timeout);
        sinon.stub(Users.prototype, 'getUser').resolves({ username: 'alice', did });

        await save();

        assert.deepEqual(updatedRows, []);
        assert.deepEqual(walletKeys, [did]);
    });

    it('links the DID without reading the user back when the update answers', async () => {
        sinon.stub(Users.prototype, 'updateCurrentUser').resolves({});
        const getUser = sinon.stub(Users.prototype, 'getUser');

        await save();

        assert.equal(getUser.called, false);
        assert.deepEqual(walletKeys, [did]);
    });
});
