import assert from 'node:assert/strict';
import { make, errorsFor, hasConstraint, hasError, isClean } from './_dto-helper.mjs';
import {
    SearchBlocksDTO,
    SearchBlocksNodeDTO,
    SearchBlocksPairDTO,
    SearchBlocksChainDTO,
} from '../../dist/middlewares/validation/schemas/analytics.js';

const validNode = () => make(SearchBlocksNodeDTO, {
    id: 'node-1',
    tag: 'pp_grid_sr',
    blockType: 'interfaceDocumentsSourceBlock',
    config: { a: 1 },
    path: [0, 1, 0],
});

const validPair = () => make(SearchBlocksPairDTO, {
    hash: 100,
    source: validNode(),
    filter: validNode(),
});

const validChain = () => make(SearchBlocksChainDTO, {
    hash: 12099,
    target: validNode(),
    pairs: [validPair()],
});

describe('SearchBlocksNodeDTO', () => {
    it('accepts a fully valid node', () => {
        assert.equal(isClean(errorsFor(SearchBlocksNodeDTO, {
            id: 'n', tag: 't', blockType: 'b', config: {}, path: [],
        })), true);
    });

    for (const field of ['id', 'tag', 'blockType']) {
        it(`rejects a non-string ${field}`, () => {
            const errs = errorsFor(SearchBlocksNodeDTO, {
                id: 'n', tag: 't', blockType: 'b', config: {}, path: [], [field]: 5,
            });
            assert.equal(hasConstraint(errs, field, 'isString'), true);
        });
    }

    it('rejects a non-object config', () => {
        const errs = errorsFor(SearchBlocksNodeDTO, {
            id: 'n', tag: 't', blockType: 'b', config: 'x', path: [],
        });
        assert.equal(hasConstraint(errs, 'config', 'isObject'), true);
    });

    it('rejects a non-array path', () => {
        const errs = errorsFor(SearchBlocksNodeDTO, {
            id: 'n', tag: 't', blockType: 'b', config: {}, path: 'x',
        });
        assert.equal(hasConstraint(errs, 'path', 'isArray'), true);
    });

    it('rejects path entries that are not numbers', () => {
        const errs = errorsFor(SearchBlocksNodeDTO, {
            id: 'n', tag: 't', blockType: 'b', config: {}, path: [0, 'one'],
        });
        assert.equal(hasConstraint(errs, 'path', 'isNumber'), true);
    });

    it('rejects a missing id', () => {
        const errs = errorsFor(SearchBlocksNodeDTO, {
            tag: 't', blockType: 'b', config: {}, path: [],
        });
        assert.equal(hasError(errs, 'id'), true);
    });
});

describe('SearchBlocksPairDTO', () => {
    it('accepts a valid pair', () => {
        assert.equal(isClean(errorsFor(SearchBlocksPairDTO, {
            hash: 1, source: validNode(), filter: validNode(),
        })), true);
    });

    it('rejects a non-number hash', () => {
        const errs = errorsFor(SearchBlocksPairDTO, {
            hash: 'x', source: validNode(), filter: validNode(),
        });
        assert.equal(hasConstraint(errs, 'hash', 'isNumber'), true);
    });

    it('flags an invalid nested source node', () => {
        const bad = validNode();
        bad.id = 7;
        const errs = errorsFor(SearchBlocksPairDTO, {
            hash: 1, source: bad, filter: validNode(),
        });
        assert.equal(hasConstraint(errs, 'source.id', 'isString'), true);
    });

    it('flags an invalid nested filter node', () => {
        const bad = validNode();
        bad.path = 'not-array';
        const errs = errorsFor(SearchBlocksPairDTO, {
            hash: 1, source: validNode(), filter: bad,
        });
        assert.equal(hasConstraint(errs, 'filter.path', 'isArray'), true);
    });

    it('rejects a missing hash', () => {
        const errs = errorsFor(SearchBlocksPairDTO, {
            source: validNode(), filter: validNode(),
        });
        assert.equal(hasError(errs, 'hash'), true);
    });
});

describe('SearchBlocksChainDTO', () => {
    it('accepts a valid chain', () => {
        assert.equal(isClean(errorsFor(SearchBlocksChainDTO, {
            hash: 1, target: validNode(), pairs: [validPair()],
        })), true);
    });

    it('accepts an empty pairs array', () => {
        assert.equal(isClean(errorsFor(SearchBlocksChainDTO, {
            hash: 1, target: validNode(), pairs: [],
        })), true);
    });

    it('rejects a non-number hash', () => {
        const errs = errorsFor(SearchBlocksChainDTO, {
            hash: {}, target: validNode(), pairs: [],
        });
        assert.equal(hasConstraint(errs, 'hash', 'isNumber'), true);
    });

    it('rejects a non-array pairs', () => {
        const errs = errorsFor(SearchBlocksChainDTO, {
            hash: 1, target: validNode(), pairs: 'x',
        });
        assert.equal(hasConstraint(errs, 'pairs', 'isArray'), true);
    });

    it('flags an invalid pair inside the array', () => {
        const bad = validPair();
        bad.hash = 'oops';
        const errs = errorsFor(SearchBlocksChainDTO, {
            hash: 1, target: validNode(), pairs: [bad],
        });
        assert.equal(hasConstraint(errs, 'pairs.0.hash', 'isNumber'), true);
    });
});

describe('SearchBlocksDTO', () => {
    const validProps = () => ({
        name: 'CDM AMS-III.AR Policy',
        description: 'desc',
        version: '1',
        owner: 'did:hedera:testnet:abc',
        topicId: '0.0.1',
        messageId: '1706823227.586179534',
        hash: 12099,
        chains: [validChain()],
    });

    it('accepts a fully valid payload', () => {
        assert.equal(isClean(errorsFor(SearchBlocksDTO, validProps())), true);
    });

    for (const field of ['name', 'description', 'version', 'owner', 'topicId', 'messageId']) {
        it(`rejects a non-string ${field}`, () => {
            const errs = errorsFor(SearchBlocksDTO, { ...validProps(), [field]: 42 });
            assert.equal(hasConstraint(errs, field, 'isString'), true);
        });
    }

    it('rejects a non-number hash', () => {
        const errs = errorsFor(SearchBlocksDTO, { ...validProps(), hash: 'x' });
        assert.equal(hasConstraint(errs, 'hash', 'isNumber'), true);
    });

    it('rejects a non-array chains', () => {
        const errs = errorsFor(SearchBlocksDTO, { ...validProps(), chains: {} });
        assert.equal(hasConstraint(errs, 'chains', 'isArray'), true);
    });

    it('flags an invalid chain entry', () => {
        const bad = validChain();
        bad.hash = null;
        const errs = errorsFor(SearchBlocksDTO, { ...validProps(), chains: [bad] });
        assert.equal(hasConstraint(errs, 'chains.0.hash', 'isNumber'), true);
    });

    it('rejects a missing name', () => {
        const props = validProps();
        delete props.name;
        assert.equal(hasError(errorsFor(SearchBlocksDTO, props), 'name'), true);
    });
});
