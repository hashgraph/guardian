import assert from 'node:assert/strict';
import {
    getDeprecationMessagesForBlock,
    getDeprecationMessagesForProperties,
} from '../dist/validators/policy-messages/adapter-from-deprecations.js';
import { DEPRECATED_BLOCKS, DEPRECATED_PROPERTIES } from '../dist/validators/deprecations/index.js';
import { MSG_DEPRECATION_BLOCK, MSG_DEPRECATION_PROP } from '../dist/validators/policy-messages/types.js';

describe('getDeprecationMessagesForBlock with registered entries', () => {
    before(() => {
        DEPRECATED_BLOCKS.set('unitTestBlockFull', {
            severity: 'error',
            since: 'since 2.0',
            alternative: 'use otherBlock',
            alternativeBlockType: 'otherBlock',
            reason: 'because',
            removalPlanned: 'in 3.0',
        });
        DEPRECATED_BLOCKS.set('unitTestBlockBare', {});
        DEPRECATED_BLOCKS.set('unitTestBlockSpacey', {
            alternative: '  padded  ',
            reason: '   ',
        });
    });

    after(() => {
        DEPRECATED_BLOCKS.delete('unitTestBlockFull');
        DEPRECATED_BLOCKS.delete('unitTestBlockBare');
        DEPRECATED_BLOCKS.delete('unitTestBlockSpacey');
    });

    it('returns one message for a deprecated block', () => {
        const messages = getDeprecationMessagesForBlock('unitTestBlockFull');
        assert.equal(messages.length, 1);
        assert.equal(messages[0].code, MSG_DEPRECATION_BLOCK);
        assert.equal(messages[0].blockType, 'unitTestBlockFull');
    });

    it('uses the registered severity', () => {
        assert.equal(getDeprecationMessagesForBlock('unitTestBlockFull')[0].severity, 'error');
    });

    it('defaults severity to warning when unset', () => {
        assert.equal(getDeprecationMessagesForBlock('unitTestBlockBare')[0].severity, 'warning');
    });

    it('composes the text from name plus every populated info field', () => {
        const [message] = getDeprecationMessagesForBlock('unitTestBlockFull');
        assert.equal(
            message.text,
            '"unitTestBlockFull" was deprecated. use otherBlock otherBlock because since 2.0 in 3.0',
        );
    });

    it('omits empty info fields from the text', () => {
        const [message] = getDeprecationMessagesForBlock('unitTestBlockBare');
        assert.equal(message.text, '"unitTestBlockBare" was deprecated.');
    });

    it('trims info fields and drops whitespace-only ones', () => {
        const [message] = getDeprecationMessagesForBlock('unitTestBlockSpacey');
        assert.equal(message.text, '"unitTestBlockSpacey" was deprecated. padded');
    });

    it('carries since and removalPlanned through to the message', () => {
        const [message] = getDeprecationMessagesForBlock('unitTestBlockFull');
        assert.equal(message.since, 'since 2.0');
        assert.equal(message.removalPlanned, 'in 3.0');
    });
});

describe('getDeprecationMessagesForProperties with registered entries', () => {
    before(() => {
        DEPRECATED_PROPERTIES.set('unitTestPropsBlock', new Map([
            ['uiMetaData.title', { severity: 'info', reason: 'use header' }],
            ['plain', {}],
            ['items[0].name', {}],
        ]));
    });

    after(() => {
        DEPRECATED_PROPERTIES.delete('unitTestPropsBlock');
    });

    it('emits messages only for properties present in the configuration', () => {
        const messages = getDeprecationMessagesForProperties('unitTestPropsBlock', { plain: 1 });
        assert.equal(messages.length, 1);
        assert.equal(messages[0].property, 'plain');
        assert.equal(messages[0].code, MSG_DEPRECATION_PROP);
    });

    it('resolves dot-delimited nested paths', () => {
        const messages = getDeprecationMessagesForProperties('unitTestPropsBlock', {
            uiMetaData: { title: 'x' },
        });
        assert.equal(messages.length, 1);
        assert.equal(messages[0].property, 'uiMetaData.title');
        assert.equal(messages[0].severity, 'info');
        assert.equal(messages[0].text, '"uiMetaData.title" was deprecated. use header');
    });

    it('resolves bracketed array index paths', () => {
        const messages = getDeprecationMessagesForProperties('unitTestPropsBlock', {
            items: [{ name: 'first' }],
        });
        assert.equal(messages.length, 1);
        assert.equal(messages[0].property, 'items[0].name');
    });

    it('treats a null property value as used', () => {
        const messages = getDeprecationMessagesForProperties('unitTestPropsBlock', { plain: null });
        assert.equal(messages.length, 1);
    });

    it('skips properties whose parent path is missing', () => {
        const messages = getDeprecationMessagesForProperties('unitTestPropsBlock', {
            uiMetaData: 'not-an-object',
        });
        assert.deepEqual(messages, []);
    });

    it('returns [] for a non-object configuration', () => {
        assert.deepEqual(getDeprecationMessagesForProperties('unitTestPropsBlock', 'text'), []);
    });

    it('emits one message per matched property in registry order', () => {
        const messages = getDeprecationMessagesForProperties('unitTestPropsBlock', {
            uiMetaData: { title: 't' },
            plain: true,
        });
        assert.deepEqual(messages.map((m) => m.property), ['uiMetaData.title', 'plain']);
    });

    it('defaults property message severity to warning', () => {
        const [message] = getDeprecationMessagesForProperties('unitTestPropsBlock', { plain: 1 });
        assert.equal(message.severity, 'warning');
    });
});
