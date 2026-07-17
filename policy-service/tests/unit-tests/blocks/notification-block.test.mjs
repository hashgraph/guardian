import { assert } from 'chai';
import { NotificationBlock } from '../../../dist/policy-engine/block-validators/blocks/notification.block.js';

class FakeValidator {
    constructor() { this.errors = []; }
    addError(msg) { this.errors.push(msg); }
    async getArtifact() { return {}; }
    getErrorMessage(err) { return err?.message ?? String(err); }
}

const refWith = (overrides = {}) => ({
    options: {
        title: 'Hello',
        message: 'World',
        type: 'INFO',
        user: 'ALL',
        ...overrides,
    },
    children: [],
});

describe('NotificationBlock.validate', () => {
    it('passes a fully-populated config', async () => {
        const v = new FakeValidator();
        await NotificationBlock.validate(v, refWith());
        assert.deepEqual(v.errors, []);
    });

    it('rejects missing title', async () => {
        const v = new FakeValidator();
        await NotificationBlock.validate(v, refWith({ title: '' }));
        assert.include(v.errors, 'Option "title" is empty');
    });

    it('rejects missing message', async () => {
        const v = new FakeValidator();
        await NotificationBlock.validate(v, refWith({ message: '' }));
        assert.include(v.errors, 'Option "message" is empty');
    });

    it('rejects unknown notification type', async () => {
        const v = new FakeValidator();
        await NotificationBlock.validate(v, refWith({ type: 'PIZZA' }));
        assert.include(v.errors, 'Option "type" has incorrect value');
    });

    it('rejects unknown user option', async () => {
        const v = new FakeValidator();
        await NotificationBlock.validate(v, refWith({ user: 'ANYONE' }));
        assert.include(v.errors, 'Option "user" has incorrect value');
    });

    it('requires role when user=ROLE', async () => {
        const v = new FakeValidator();
        await NotificationBlock.validate(v, refWith({ user: 'ROLE' }));
        assert.include(v.errors, 'Option "role" is empty');
    });

    it('passes user=ROLE when role is provided', async () => {
        const v = new FakeValidator();
        await NotificationBlock.validate(v, refWith({ user: 'ROLE', role: 'admin' }));
        assert.deepEqual(v.errors, []);
    });

    it('accepts each NotificationType (INFO/WARN/ERROR/SUCCESS)', async () => {
        for (const type of ['INFO', 'WARN', 'ERROR', 'SUCCESS']) {
            const v = new FakeValidator();
            await NotificationBlock.validate(v, refWith({ type }));
            assert.deepEqual(v.errors, [], `type=${type} unexpectedly failed`);
        }
    });

    it('accepts ALL / GROUP_OWNER user options without further checks', async () => {
        for (const user of ['ALL', 'GROUP_OWNER']) {
            const v = new FakeValidator();
            await NotificationBlock.validate(v, refWith({ user }));
            assert.deepEqual(v.errors, [], `user=${user} unexpectedly failed`);
        }
    });
});
