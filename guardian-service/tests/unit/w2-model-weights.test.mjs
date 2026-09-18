import assert from 'node:assert/strict';
import { TokenModel } from '../../dist/analytics/compare/models/token.model.js';
import { RoleModel } from '../../dist/analytics/compare/models/role.model.js';
import { GroupModel } from '../../dist/analytics/compare/models/group.model.js';
import { VariableModel } from '../../dist/analytics/compare/models/variable.model.js';
import { TopicModel } from '../../dist/analytics/compare/models/topic.model.js';

const opts = (overrides = {}) => ({ propLvl: 'All', keyLvl: 'Default', idLvl: 'All', ...overrides });

const rawToken = (extra = {}) => ({
    id: 'id-1',
    tokenId: '0.0.1',
    tokenName: 'Carbon',
    tokenSymbol: 'CO2',
    tokenType: 'fungible',
    decimals: 2,
    initialSupply: 100,
    enableAdmin: true,
    enableFreeze: false,
    enableKYC: true,
    enableWipe: false,
    ...extra,
});

describe('TokenModel', () => {
    it('copies all token fields', () => {
        const t = new TokenModel(rawToken(), opts());
        assert.equal(t.tokenId, '0.0.1');
        assert.equal(t.tokenName, 'Carbon');
        assert.equal(t.decimals, 2);
        assert.equal(t.enableKYC, true);
    });

    it('computes a non-empty weight on construction', () => {
        const t = new TokenModel(rawToken(), opts());
        assert.ok(t.hash(opts()).length > 0);
    });

    it('equal compares tokenId only', () => {
        const a = new TokenModel(rawToken(), opts());
        const b = new TokenModel(rawToken({ tokenName: 'Other' }), opts());
        assert.equal(a.equal(b), true);
        const c = new TokenModel(rawToken({ tokenId: '0.0.2' }), opts());
        assert.equal(a.equal(c), false);
    });

    it('equalKey compares tokenId', () => {
        const a = new TokenModel(rawToken(), opts());
        const c = new TokenModel(rawToken({ tokenId: '0.0.9' }), opts());
        assert.equal(a.equalKey(c), false);
    });

    it('idLvl=All includes tokenId in the hash; idLvl=None excludes it', () => {
        const all = new TokenModel(rawToken(), opts({ idLvl: 'All' }));
        const none = new TokenModel(rawToken(), opts({ idLvl: 'None' }));
        assert.notEqual(all.hash(opts()), none.hash(opts()));
    });

    it('two tokens differing only in tokenId share hash when idLvl=None', () => {
        const a = new TokenModel(rawToken({ tokenId: 'A' }), opts({ idLvl: 'None' }));
        const b = new TokenModel(rawToken({ tokenId: 'B' }), opts({ idLvl: 'None' }));
        assert.equal(a.hash(opts()), b.hash(opts()));
    });

    it('toObject round-trips the documented shape', () => {
        const t = new TokenModel(rawToken(), opts());
        const o = t.toObject();
        assert.equal(o.id, 'id-1');
        assert.equal(o.tokenSymbol, 'CO2');
        assert.equal(o.enableWipe, false);
    });

    it('toWeight returns the computed weight', () => {
        const t = new TokenModel(rawToken(), opts());
        assert.equal(t.toWeight(opts()).weight, t.hash(opts()));
    });

    it('fromEntity builds and updates a model', () => {
        const t = TokenModel.fromEntity(rawToken(), opts());
        assert.ok(t instanceof TokenModel);
        assert.equal(t.tokenId, '0.0.1');
    });

    it('fromEntity throws on falsy input', () => {
        assert.throws(() => TokenModel.fromEntity(null, opts()), /Unknown token/);
    });
});

describe('RoleModel weight accessors', () => {
    it('getWeight(type) reads named weight after update', () => {
        const r = new RoleModel('Issuer');
        r.update(opts());
        assert.equal(r.getWeight('ROLE_LVL_0'), r.getWeight());
    });

    it('getWeights returns array; maxWeight matches its length', () => {
        const r = new RoleModel('Issuer');
        r.update(opts());
        assert.equal(r.maxWeight(), r.getWeights().length);
        assert.equal(r.maxWeight(), 1);
    });

    it('maxWeight is 0 before update', () => {
        const r = new RoleModel('Issuer');
        assert.equal(r.maxWeight(), 0);
    });

    it('getPropList returns the lone name property', () => {
        const r = new RoleModel('Issuer');
        const list = r.getPropList();
        assert.equal(list.length, 1);
        assert.equal(list[0].name, 'name');
        assert.equal(list[0].value, 'Issuer');
    });

    it('equal with explicit index reads that weight slot', () => {
        const a = new RoleModel('X');
        const b = new RoleModel('X');
        a.update(opts());
        b.update(opts());
        assert.equal(a.equal(b, 0), true);
    });

    it('distinct role names are unequal after update', () => {
        const a = new RoleModel('A');
        const b = new RoleModel('B');
        a.update(opts());
        b.update(opts());
        assert.equal(a.equal(b), false);
    });
});

describe('GroupModel weight branches', () => {
    const group = (name, extra = {}) => new GroupModel({ name, ...extra });

    it('update populates GROUP_LVL_0 and GROUP_LVL_1', () => {
        const g = group('G1');
        g.update(opts());
        assert.equal(g.getWeights().length, 2);
        assert.ok(g.getWeight('GROUP_LVL_0'));
        assert.ok(g.getWeight('GROUP_LVL_1'));
    });

    it('equal at looser index matches same-name groups with differing props', () => {
        const a = group('G', { creator: 'x' });
        const b = group('G', { creator: 'y' });
        a.update(opts());
        b.update(opts());
        assert.equal(a.equal(b, 1), true);
    });

    it('equal at strongest (index 0) distinguishes differing props', () => {
        const a = group('G', { creator: 'x' });
        const b = group('G', { creator: 'y' });
        a.update(opts());
        b.update(opts());
        assert.equal(a.equal(b, 0), false);
    });

    it('equalKey compares names', () => {
        const a = group('G');
        const b = group('G');
        const c = group('H');
        assert.equal(a.equalKey(b), true);
        assert.equal(a.equalKey(c), false);
    });

    it('toWeight returns name pre-update, hash post-update', () => {
        const g = group('G');
        assert.equal(g.toWeight(opts()).weight, 'G');
        g.update(opts());
        assert.equal(g.toWeight(opts()).weight, g.getWeight());
    });

    it('checkWeight true within range and false beyond', () => {
        const g = group('G');
        g.update(opts());
        assert.equal(g.checkWeight(1), true);
        assert.equal(g.checkWeight(5), false);
    });
});

describe('VariableModel', () => {
    const v = (name, extra = {}) => new VariableModel({ name, ...extra });

    it('exposes name as key', () => {
        assert.equal(v('V1').key, 'V1');
    });

    it('update populates two weights', () => {
        const m = v('V1');
        m.update(opts());
        assert.equal(m.getWeights().length, 2);
    });

    it('falls back to name comparison before update', () => {
        const a = v('A');
        const b = v('A');
        const c = v('B');
        assert.equal(a.equal(b), true);
        assert.equal(a.equal(c), false);
    });

    it('equalKey compares names', () => {
        assert.equal(v('A').equalKey(v('A')), true);
        assert.equal(v('A').equalKey(v('B')), false);
    });

    it('toObject returns {name, properties}', () => {
        const o = v('V1', { description: 'd' }).toObject();
        assert.equal(o.name, 'V1');
        assert.ok(Array.isArray(o.properties));
    });
});

describe('TopicModel', () => {
    const t = (name, extra = {}) => new TopicModel({ name, ...extra });

    it('name is the key', () => {
        assert.equal(t('T1').key, 'T1');
    });

    it('update populates TOPIC_LVL_0/1', () => {
        const m = t('T1');
        m.update(opts());
        assert.ok(m.getWeight('TOPIC_LVL_0'));
        assert.ok(m.getWeight('TOPIC_LVL_1'));
    });

    it('equal at index 1 matches same name with differing details', () => {
        const a = t('T', { description: 'x' });
        const b = t('T', { description: 'y' });
        a.update(opts());
        b.update(opts());
        assert.equal(a.equal(b, 1), true);
    });

    it('getWeight(type) reads named slot', () => {
        const m = t('T1');
        m.update(opts());
        assert.equal(m.getWeight('TOPIC_LVL_0'), m.getWeights()[1]);
    });

    it('equalKey compares names', () => {
        assert.equal(t('T').equalKey(t('T')), true);
    });
});
