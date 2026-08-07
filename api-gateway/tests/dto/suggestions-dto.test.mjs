import assert from 'node:assert/strict';
import { errorsFor, hasConstraint, hasError, isClean } from './_dto-helper.mjs';
import {
    SuggestionsInputDTO,
    SuggestionsOutputDTO,
    SuggestionsConfigItemDTO,
    SuggestionsConfigDTO,
} from '../../dist/middlewares/validation/schemas/suggestions.js';

describe('SuggestionsInputDTO', () => {
    it('accepts a valid block type', () => {
        assert.equal(isClean(errorsFor(SuggestionsInputDTO, { blockType: 'interfaceContainerBlock' })), true);
    });

    it('rejects a missing blockType', () => {
        assert.equal(hasConstraint(errorsFor(SuggestionsInputDTO, {}), 'blockType', 'isNotEmpty'), true);
    });

    it('rejects an empty blockType', () => {
        assert.equal(hasConstraint(errorsFor(SuggestionsInputDTO, { blockType: '' }), 'blockType', 'isNotEmpty'), true);
    });

    it('rejects a non-string blockType', () => {
        assert.equal(hasConstraint(errorsFor(SuggestionsInputDTO, { blockType: 1 }), 'blockType', 'isString'), true);
    });

    it('does not validate children', () => {
        assert.equal(isClean(errorsFor(SuggestionsInputDTO, { blockType: 'a', children: 'anything' })), true);
    });
});

describe('SuggestionsOutputDTO', () => {
    it('accepts valid output', () => {
        assert.equal(isClean(errorsFor(SuggestionsOutputDTO, { next: 'a', nested: 'b' })), true);
    });

    it('requires next', () => {
        assert.equal(hasConstraint(errorsFor(SuggestionsOutputDTO, { nested: 'b' }), 'next', 'isString'), true);
    });

    it('rejects a non-string nested', () => {
        assert.equal(hasConstraint(errorsFor(SuggestionsOutputDTO, { next: 'a', nested: 5 }), 'nested', 'isString'), true);
    });
});

describe('SuggestionsConfigItemDTO', () => {
    it('accepts a valid Policy item', () => {
        assert.equal(isClean(errorsFor(SuggestionsConfigItemDTO, { id: 'a', type: 'Policy', index: 0 })), true);
    });

    it('accepts a valid Module item', () => {
        assert.equal(isClean(errorsFor(SuggestionsConfigItemDTO, { id: 'a', type: 'Module', index: 2 })), true);
    });

    it('rejects an unknown type', () => {
        assert.equal(hasConstraint(errorsFor(SuggestionsConfigItemDTO, { id: 'a', type: 'Tool', index: 0 }), 'type', 'isEnum'), true);
    });

    it('rejects a non-integer index', () => {
        assert.equal(hasConstraint(errorsFor(SuggestionsConfigItemDTO, { id: 'a', type: 'Policy', index: 1.5 }), 'index', 'isInt'), true);
    });

    it('rejects an empty id', () => {
        assert.equal(hasConstraint(errorsFor(SuggestionsConfigItemDTO, { id: '', type: 'Policy', index: 0 }), 'id', 'isNotEmpty'), true);
    });

    it('rejects a missing id', () => {
        assert.equal(hasError(errorsFor(SuggestionsConfigItemDTO, { type: 'Policy', index: 0 }), 'id'), true);
    });
});

describe('SuggestionsConfigDTO', () => {
    it('accepts an items array', () => {
        assert.equal(isClean(errorsFor(SuggestionsConfigDTO, { items: [] })), true);
    });

    it('rejects a non-array items', () => {
        assert.equal(hasConstraint(errorsFor(SuggestionsConfigDTO, { items: {} }), 'items', 'isArray'), true);
    });
});
