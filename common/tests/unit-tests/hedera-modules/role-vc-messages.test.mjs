import { assert } from 'chai';
import {
    RoleMessage,
    GuardianRoleMessage,
    UserPermissionsMessage,
    MessageType,
    MessageAction
} from '../../../dist/hedera-modules/message/index.js';

const vcBase = (type) => ({
    id: 'mid', status: 'ISSUE', type, action: MessageAction.CreateVC,
    lang: 'en', account: '0.0.3', issuer: 'did:issuer',
    cid: 'testCID', url: 'ipfs://testCID', relationships: ['r1', 'r2']
});

describe('RoleMessage', () => {
    it('constructs with the RoleDocument type by default', () => {
        const m = new RoleMessage(MessageAction.CreateVC);
        assert.equal(m.type, MessageType.RoleDocument);
    });

    it('setRole stores role and group, exposed by getters', () => {
        const m = new RoleMessage(MessageAction.CreateVC);
        m.setRole({ role: 'Installer', groupName: 'GroupA' });
        assert.equal(m.getRole(), 'Installer');
        assert.equal(m.getGroup(), 'GroupA');
    });

    it('fromMessageObject throws on empty json', () => {
        assert.throws(() => RoleMessage.fromMessageObject(null), /JSON Object is empty/);
    });

    it('fromMessageObject maps role/group and inherited VC url', () => {
        const m = RoleMessage.fromMessageObject({ ...vcBase(MessageType.RoleDocument), role: 'Auditor', group: 'G1' });
        assert.equal(m.role, 'Auditor');
        assert.equal(m.group, 'G1');
        assert.deepEqual(m.getUrl(), { cid: 'testCID', url: 'ipfs://testCID' });
    });

    it('toMessageObject includes role/group when present', () => {
        const m = RoleMessage.fromMessageObject({ ...vcBase(MessageType.RoleDocument), role: 'Auditor', group: 'G1' });
        const obj = m.toMessageObject();
        assert.equal(obj.role, 'Auditor');
        assert.equal(obj.group, 'G1');
    });

    it('toJson / fromJson round-trips role and group', () => {
        const original = RoleMessage.fromMessageObject({ ...vcBase(MessageType.RoleDocument), role: 'Auditor', group: 'G1' });
        const restored = RoleMessage.fromJson(original.toJson());
        assert.equal(restored.role, 'Auditor');
        assert.equal(restored.group, 'G1');
    });
});

describe('GuardianRoleMessage', () => {
    it('constructs with the GuardianRole type by default', () => {
        const m = new GuardianRoleMessage(MessageAction.CreateVC);
        assert.equal(m.type, MessageType.GuardianRole);
    });

    it('setRole stores uuid/name/description', () => {
        const m = new GuardianRoleMessage(MessageAction.CreateVC);
        m.setRole({ uuid: 'u1', name: 'Admin', description: 'desc' });
        assert.equal(m.uuid, 'u1');
        assert.equal(m.name, 'Admin');
        assert.equal(m.description, 'desc');
    });

    it('fromMessageObject throws on empty json', () => {
        assert.throws(() => GuardianRoleMessage.fromMessageObject(null), /JSON Object is empty/);
    });

    it('fromMessageObject maps uuid/name/description', () => {
        const m = GuardianRoleMessage.fromMessageObject({ ...vcBase(MessageType.GuardianRole), uuid: 'u1', name: 'Admin', description: 'd' });
        assert.equal(m.uuid, 'u1');
        assert.equal(m.name, 'Admin');
        assert.equal(m.description, 'd');
    });

    it('toMessageObject includes role fields when present', () => {
        const m = GuardianRoleMessage.fromMessageObject({ ...vcBase(MessageType.GuardianRole), uuid: 'u1', name: 'Admin', description: 'd' });
        const obj = m.toMessageObject();
        assert.equal(obj.uuid, 'u1');
        assert.equal(obj.name, 'Admin');
    });

    it('toJson / fromJson round-trips role fields', () => {
        const original = GuardianRoleMessage.fromMessageObject({ ...vcBase(MessageType.GuardianRole), uuid: 'u1', name: 'Admin', description: 'd' });
        const restored = GuardianRoleMessage.fromJson(original.toJson());
        assert.equal(restored.uuid, 'u1');
        assert.equal(restored.description, 'd');
    });
});

describe('UserPermissionsMessage', () => {
    it('constructs with the UserPermissions type by default', () => {
        const m = new UserPermissionsMessage(MessageAction.CreateVC);
        assert.equal(m.type, MessageType.UserPermissions);
    });

    it('setRole stores the user DID', () => {
        const m = new UserPermissionsMessage(MessageAction.CreateVC);
        m.setRole({ user: 'did:user' });
        assert.equal(m.user, 'did:user');
    });

    it('fromMessageObject throws on empty json', () => {
        assert.throws(() => UserPermissionsMessage.fromMessageObject(null), /JSON Object is empty/);
    });

    it('fromMessageObject maps the user field', () => {
        const m = UserPermissionsMessage.fromMessageObject({ ...vcBase(MessageType.UserPermissions), user: 'did:user' });
        assert.equal(m.user, 'did:user');
    });

    it('toMessageObject includes the user when present', () => {
        const m = UserPermissionsMessage.fromMessageObject({ ...vcBase(MessageType.UserPermissions), user: 'did:user' });
        assert.equal(m.toMessageObject().user, 'did:user');
    });

    it('toJson / fromJson round-trips the user field', () => {
        const original = UserPermissionsMessage.fromMessageObject({ ...vcBase(MessageType.UserPermissions), user: 'did:user' });
        const restored = UserPermissionsMessage.fromJson(original.toJson());
        assert.equal(restored.user, 'did:user');
    });
});
