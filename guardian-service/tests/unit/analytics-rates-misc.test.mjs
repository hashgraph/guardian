import assert from 'node:assert/strict';
import { ArtifactsRate } from '../../dist/analytics/compare/rates/artifacts-rate.js';
import { EventsRate } from '../../dist/analytics/compare/rates/events-rate.js';
import { PermissionsRate } from '../../dist/analytics/compare/rates/permissions-rate.js';

const fakeArtifact = (label) => ({ uuid: label, toObject: () => ({ uuid: label }) });
const fakeEvent = (label) => ({ source: label, toObject: () => ({ source: label }) });

describe('ArtifactsRate', () => {
    it('marks both-present pair as 100% (FULL)', () => {
        const r = new ArtifactsRate(fakeArtifact('a'), fakeArtifact('b'));
        assert.equal(r.totalRate, 100);
    });

    it('marks left-only pair with totalRate=-1', () => {
        const r = new ArtifactsRate(fakeArtifact('a'), null);
        assert.equal(r.totalRate, -1);
    });

    it('marks right-only pair with totalRate=-1', () => {
        const r = new ArtifactsRate(null, fakeArtifact('b'));
        assert.equal(r.totalRate, -1);
    });

    it('serializes both items via toObject() inherited from Rate', () => {
        const r = new ArtifactsRate(fakeArtifact('a'), fakeArtifact('b'));
        const obj = r.toObject();
        assert.deepEqual(obj.items[0], { uuid: 'a' });
        assert.deepEqual(obj.items[1], { uuid: 'b' });
    });
});

describe('EventsRate', () => {
    it('marks both-present pair as 100% (FULL)', () => {
        const r = new EventsRate(fakeEvent('a'), fakeEvent('b'));
        assert.equal(r.totalRate, 100);
    });

    it('marks left-only pair with totalRate=-1', () => {
        const r = new EventsRate(fakeEvent('a'), null);
        assert.equal(r.totalRate, -1);
    });

    it('marks right-only pair with totalRate=-1', () => {
        const r = new EventsRate(null, fakeEvent('b'));
        assert.equal(r.totalRate, -1);
    });
});

describe('PermissionsRate', () => {
    it('marks identical strings as FULL (100%)', () => {
        const r = new PermissionsRate('OWNER', 'OWNER');
        assert.equal(r.totalRate, 100);
    });

    it('marks differing strings with totalRate=-1', () => {
        const r = new PermissionsRate('OWNER', 'VIEWER');
        assert.equal(r.totalRate, -1);
    });

    it('marks left-only with totalRate=-1', () => {
        const r = new PermissionsRate('OWNER', null);
        assert.equal(r.totalRate, -1);
    });

    it('marks right-only with totalRate=-1', () => {
        const r = new PermissionsRate(null, 'OWNER');
        assert.equal(r.totalRate, -1);
    });

    it('toObject embeds the literal left/right values in items', () => {
        const r = new PermissionsRate('OWNER', 'VIEWER');
        assert.deepEqual(r.toObject().items, ['OWNER', 'VIEWER']);
    });

    it('total() and getRateValue() echo totalRate', () => {
        const r = new PermissionsRate('OWNER', 'OWNER');
        assert.equal(r.total(), 100);
        assert.equal(r.getRateValue('any'), 100);
    });

    it('getSubRate() and getChildren() return null/[] (leaf rate)', () => {
        const r = new PermissionsRate('A', 'B');
        assert.equal(r.getSubRate('x'), null);
        assert.deepEqual(r.getChildren(), []);
    });

    it('calc() is a no-op (does not throw)', () => {
        const r = new PermissionsRate('A', 'B');
        assert.doesNotThrow(() => r.calc({}));
    });

    it('setChildren() is a no-op', () => {
        const r = new PermissionsRate('A', 'A');
        assert.doesNotThrow(() => r.setChildren([{ totalRate: 10 }]));
        assert.deepEqual(r.getChildren(), []);
    });
});
