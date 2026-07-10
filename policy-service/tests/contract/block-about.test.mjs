import assert from 'node:assert/strict';
import { GetBlockAbout } from '../../dist/policy-engine/blocks/get-block-about.js';
import { ChildrenType, ControlType } from '../../dist/policy-engine/interfaces/block-about.js';

const childrenValues = Object.values(ChildrenType);
const controlValues = Object.values(ControlType);

const aboutMap = GetBlockAbout();
const blocks = Object.entries(aboutMap).filter(
    ([blockType, about]) => typeof blockType === 'string' && blockType && about && typeof about === 'object'
);

describe('contract: block about (factory capabilities)', () => {
    it('exposes about metadata for the full block registry', () => {
        assert.ok(blocks.length >= 55, `expected the block registry to expose >=55 blocks, got ${blocks.length}`);
    });

    it('has a unique blockType per registered block', () => {
        const types = blocks.map(([t]) => t);
        assert.equal(new Set(types).size, types.length);
    });

    for (const [blockType, about] of blocks) {
        describe(blockType, () => {
            it('has a non-empty label and title', () => {
                assert.equal(typeof about.label, 'string');
                assert.ok(about.label.length > 0);
                assert.equal(typeof about.title, 'string');
                assert.ok(about.title.length > 0);
            });

            it('declares boolean post/get/defaultEvent flags', () => {
                assert.equal(typeof about.post, 'boolean', 'post');
                assert.equal(typeof about.get, 'boolean', 'get');
                assert.equal(typeof about.defaultEvent, 'boolean', 'defaultEvent');
            });

            it('declares a valid children type', () => {
                assert.ok(childrenValues.includes(about.children), `children=${about.children}`);
            });

            it('declares a valid control type', () => {
                assert.ok(controlValues.includes(about.control), `control=${about.control}`);
            });

            it('declares input as an array of event-type strings or null', () => {
                assert.ok(about.input == null || Array.isArray(about.input), 'input');
                if (Array.isArray(about.input)) {
                    assert.ok(about.input.every((e) => typeof e === 'string'));
                }
            });

            it('declares output as an array of event-type strings or null', () => {
                assert.ok(about.output == null || Array.isArray(about.output), 'output');
                if (Array.isArray(about.output)) {
                    assert.ok(about.output.every((e) => typeof e === 'string'));
                }
            });

            it('declares deprecated as a boolean when present', () => {
                if (about.deprecated !== undefined) {
                    assert.equal(typeof about.deprecated, 'boolean');
                }
            });
        });
    }
});
