import { assert } from 'chai';
import { InformationBlock } from '../../../dist/policy-engine/blocks/information-block.js';
import { InterfaceContainerBlock } from '../../../dist/policy-engine/blocks/container-block.js';
import { HttpRequestUIAddon } from '../../../dist/policy-engine/blocks/http-request-ui-addon.js';
import { PolicyComponentsUtils } from '../../../dist/policy-engine/policy-components-utils.js';

const origGetRef = PolicyComponentsUtils.GetBlockRef;

function makeRef(options = {}, overrides = {}) {
    return {
        uuid: 'ui-uuid',
        blockType: 'someUiBlock',
        actionType: 'local',
        mockId: 'mock-1',
        async getOptions() { return options; },
        ...overrides,
    };
}

function withRef(ref, fn) {
    PolicyComponentsUtils.GetBlockRef = () => ref;
    return fn();
}

after(() => {
    PolicyComponentsUtils.GetBlockRef = origGetRef;
});

describe('InformationBlock runtime — getData', () => {
    it('returns block identity and uiMetaData', async () => {
        const block = Object.create(InformationBlock.prototype);
        const ref = makeRef({ uiMetaData: { title: 'Hi', type: 'text' } });
        const data = await withRef(ref, () => block.getData({ id: 'u1', location: 'local' }));
        assert.equal(data.id, 'ui-uuid');
        assert.deepEqual(data.uiMetaData, { title: 'Hi', type: 'text' });
    });

    it('tolerates missing options', async () => {
        const block = Object.create(InformationBlock.prototype);
        const ref = makeRef(null);
        const data = await withRef(ref, () => block.getData({ id: 'u1', location: 'local' }));
        assert.isUndefined(data.uiMetaData);
    });

    it('is readonly only for REMOTE block + REMOTE user', async () => {
        const block = Object.create(InformationBlock.prototype);
        const ref = makeRef({}, { actionType: 'remote' });
        const remote = await withRef(ref, () => block.getData({ id: 'u1', location: 'remote' }));
        const local = await withRef(ref, () => block.getData({ id: 'u1', location: 'local' }));
        assert.isTrue(remote.readonly);
        assert.isFalse(local.readonly);
    });
});

function containerRef(options, children, overrides = {}) {
    return makeRef(options, {
        children,
        updateDataState() { },
        ...overrides,
    });
}

const activeChild = (blockType, uiMetaData) => ({
    blockType,
    uuid: `${blockType}-id`,
    options: { uiMetaData },
    defaultActive: true,
    isActive() { return true; },
    hasPermission() { return true; },
});

const inactiveChild = (blockType) => ({
    blockType,
    uuid: `${blockType}-id`,
    options: {},
    defaultActive: true,
    isActive() { return false; },
    hasPermission() { return true; },
});

const noPermChild = (blockType) => ({
    blockType,
    uuid: `${blockType}-id`,
    options: {},
    defaultActive: true,
    isActive() { return true; },
    hasPermission() { return false; },
});

describe('InterfaceContainerBlock runtime — getData (decorated)', () => {
    it('merges uiMetaData from own getData with child list', async () => {
        const block = Object.create(InterfaceContainerBlock.prototype);
        const ref = containerRef({ uiMetaData: { type: 'tabs' } }, [activeChild('a', { x: 1 })]);
        const data = await withRef(ref, () => block.getData({ id: 'u1', location: 'local' }));
        assert.deepEqual(data.uiMetaData, { type: 'tabs' });
        assert.lengthOf(data.blocks, 1);
        assert.equal(data.blocks[0].blockType, 'a');
    });

    it('emits undefined for inactive children', async () => {
        const block = Object.create(InterfaceContainerBlock.prototype);
        const ref = containerRef({}, [inactiveChild('b')]);
        const data = await withRef(ref, () => block.getData({ id: 'u1', location: 'local' }));
        assert.deepEqual(data.blocks, [undefined]);
    });

    it('gates out children without permission', async () => {
        const block = Object.create(InterfaceContainerBlock.prototype);
        const ref = containerRef({}, [noPermChild('c')]);
        const data = await withRef(ref, () => block.getData({ id: 'u1', location: 'local' }));
        assert.deepEqual(data.blocks, [undefined]);
    });

    it('preserves order across active and inactive children', async () => {
        const block = Object.create(InterfaceContainerBlock.prototype);
        const ref = containerRef({}, [activeChild('a'), inactiveChild('b'), activeChild('c')]);
        const data = await withRef(ref, () => block.getData({ id: 'u1', location: 'local' }));
        assert.equal(data.blocks[0].blockType, 'a');
        assert.isUndefined(data.blocks[1]);
        assert.equal(data.blocks[2].blockType, 'c');
    });
});

describe('HttpRequestUIAddon runtime — getData', () => {
    it('echoes the configured request options', async () => {
        const block = Object.create(HttpRequestUIAddon.prototype);
        const ref = makeRef({
            method: 'post',
            url: 'https://api.example/x',
            headers: [{ name: 'A', value: 'b' }],
            authentication: 'bearerToken',
            authenticationClientId: 'cid',
            authenticationScopes: 'read',
            authenticationURL: 'https://auth',
        });
        const data = await withRef(ref, () => block.getData({ id: 'u1', location: 'local' }));
        assert.equal(data.method, 'post');
        assert.equal(data.url, 'https://api.example/x');
        assert.equal(data.authentication, 'bearerToken');
        assert.equal(data.authenticationClientId, 'cid');
        assert.equal(data.authenticationScopes, 'read');
        assert.equal(data.authenticationURL, 'https://auth');
        assert.deepEqual(data.headers, [{ name: 'A', value: 'b' }]);
        assert.equal(data.mockId, 'mock-1');
    });

    it('passes through undefined optional fields', async () => {
        const block = Object.create(HttpRequestUIAddon.prototype);
        const ref = makeRef({ method: 'get', url: 'u' });
        const data = await withRef(ref, () => block.getData({ id: 'u1', location: 'local' }));
        assert.equal(data.method, 'get');
        assert.isUndefined(data.authentication);
        assert.isUndefined(data.headers);
    });

    it('readonly true for REMOTE block + REMOTE user', async () => {
        const block = Object.create(HttpRequestUIAddon.prototype);
        const ref = makeRef({ method: 'get', url: 'u' }, { actionType: 'remote' });
        const data = await withRef(ref, () => block.getData({ id: 'u1', location: 'remote' }));
        assert.isTrue(data.readonly);
    });
});
