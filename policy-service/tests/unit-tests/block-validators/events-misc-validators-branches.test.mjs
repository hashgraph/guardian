import { assert } from 'chai';
import { NotificationType, UserOption } from '@guardian/interfaces';
import { validators as allValidators } from '../../../dist/policy-engine/block-validators/block-validator.js';
import { TokenOperationAddon } from '../../../dist/policy-engine/block-validators/blocks/impact-addon.js';
import { GlobalEventsReaderBlock } from '../../../dist/policy-engine/block-validators/blocks/global-events-reader-block.js';
import { GlobalEventsWriterBlock } from '../../../dist/policy-engine/block-validators/blocks/global-events-writer-block.js';
import { NotificationBlock } from '../../../dist/policy-engine/block-validators/blocks/notification.block.js';
import { MultiSignBlock } from '../../../dist/policy-engine/block-validators/blocks/multi-sign-block.js';
import { SplitBlock } from '../../../dist/policy-engine/block-validators/blocks/split-block.js';
import { ButtonBlockAddon } from '../../../dist/policy-engine/block-validators/blocks/button-block-addon.js';
import { DropdownBlockAddon } from '../../../dist/policy-engine/block-validators/blocks/dropdown-block-addon.js';
import { CommonBlock } from '../../../dist/policy-engine/block-validators/blocks/common.js';
import { PropertyValidator } from '../../../dist/policy-engine/block-validators/property-validator.js';

class FakeValidator {
    constructor(opts = {}) {
        this.errors = [];
        this._artifactMissing = !!opts.artifactMissing;
        this._schemaError = opts.schemaError ?? null;
    }
    addError(msg) { this.errors.push(msg); }
    async getArtifact() { return this._artifactMissing ? null : {}; }
    getErrorMessage(err) { return err?.message ?? String(err); }
    checkBlockError(err) { if (err) { this.errors.push(err); } }
    validateSchemaVariable(name, value, required) {
        if (this._schemaError) { return this._schemaError; }
        if (!value && required) { return `Option "${name}" is not set`; }
        return null;
    }
}

const ref = (options = {}, children = []) => ({ options, children });
const has = (v, sub) => v.errors.some(e => typeof e === 'string' && e.includes(sub));

describe('GlobalEventsReaderBlock.validate branches', () => {
    it('blockType is globalEventsReaderBlock', () => {
        assert.equal(GlobalEventsReaderBlock.blockType, 'globalEventsReaderBlock');
    });
    it('non-array eventTopics adds error', async () => {
        const v = new FakeValidator();
        await GlobalEventsReaderBlock.validate(v, ref({ eventTopics: 'x' }));
        assert.isTrue(has(v, 'Option "eventTopics" must be an array'));
    });
    it('eventTopics missing topicId adds error', async () => {
        const v = new FakeValidator();
        await GlobalEventsReaderBlock.validate(v, ref({ eventTopics: [{ topicId: '' }] }));
        assert.isTrue(has(v, 'topicId" is not set'));
    });
    it('non-array branches adds error', async () => {
        const v = new FakeValidator();
        await GlobalEventsReaderBlock.validate(v, ref({ branches: 'x' }));
        assert.isTrue(has(v, 'Option "branches" must be an array'));
    });
    it('branch missing branchEvent adds error', async () => {
        const v = new FakeValidator();
        await GlobalEventsReaderBlock.validate(v, ref({ branches: [{ documentType: 'vc' }] }));
        assert.isTrue(has(v, 'branchEvent" is not set'));
    });
    it('branch invalid documentType adds error', async () => {
        const v = new FakeValidator();
        await GlobalEventsReaderBlock.validate(v, ref({ branches: [{ branchEvent: 'e', documentType: 'bad' }] }));
        assert.isTrue(has(v, 'documentType" must be one of'));
    });
    it('branch schema error propagated', async () => {
        const v = new FakeValidator({ schemaError: 'bad schema' });
        await GlobalEventsReaderBlock.validate(v, ref({ branches: [{ branchEvent: 'e', documentType: 'vc', schema: 'iri' }] }));
        assert.isTrue(has(v, 'bad schema'));
    });
    it('valid config yields no errors', async () => {
        const v = new FakeValidator();
        await GlobalEventsReaderBlock.validate(v, ref({ eventTopics: [{ topicId: '0.0.1' }], branches: [{ branchEvent: 'e', documentType: 'vc' }] }));
        assert.deepEqual(v.errors, []);
    });
});

describe('GlobalEventsWriterBlock.validate branches', () => {
    it('blockType is globalEventsWriterBlock', () => {
        assert.equal(GlobalEventsWriterBlock.blockType, 'globalEventsWriterBlock');
    });
    it('non-array topicIds adds error', async () => {
        const v = new FakeValidator();
        await GlobalEventsWriterBlock.validate(v, ref({ topicIds: 'x' }));
        assert.isTrue(has(v, 'Option "topicIds" must be an array'));
    });
    it('item missing topicId adds error', async () => {
        const v = new FakeValidator();
        await GlobalEventsWriterBlock.validate(v, ref({ topicIds: [{ documentType: 'vc' }] }));
        assert.isTrue(has(v, 'Option "topicId" is not set'));
    });
    it('item missing documentType adds error', async () => {
        const v = new FakeValidator();
        await GlobalEventsWriterBlock.validate(v, ref({ topicIds: [{ topicId: '0.0.1' }] }));
        assert.isTrue(has(v, 'Option "documentType" is not set'));
    });
    it('item invalid documentType adds error', async () => {
        const v = new FakeValidator();
        await GlobalEventsWriterBlock.validate(v, ref({ topicIds: [{ topicId: '0.0.1', documentType: 'bad' }] }));
        assert.isTrue(has(v, 'Option "documentType" must be one of'));
    });
    it('valid config yields no errors', async () => {
        const v = new FakeValidator();
        await GlobalEventsWriterBlock.validate(v, ref({ topicIds: [{ topicId: '0.0.1', documentType: 'vc' }] }));
        assert.deepEqual(v.errors, []);
    });
});

describe('NotificationBlock.validate branches', () => {
    it('blockType is notificationBlock', () => {
        assert.equal(NotificationBlock.blockType, 'notificationBlock');
    });
    it('missing title adds error', async () => {
        const v = new FakeValidator();
        await NotificationBlock.validate(v, ref({ message: 'm', type: NotificationType.INFO, user: UserOption.ALL }));
        assert.isTrue(has(v, 'Option "title" is empty'));
    });
    it('missing message adds error', async () => {
        const v = new FakeValidator();
        await NotificationBlock.validate(v, ref({ title: 't', type: NotificationType.INFO, user: UserOption.ALL }));
        assert.isTrue(has(v, 'Option "message" is empty'));
    });
    it('invalid type adds error', async () => {
        const v = new FakeValidator();
        await NotificationBlock.validate(v, ref({ title: 't', message: 'm', type: 'BOGUS', user: UserOption.ALL }));
        assert.isTrue(has(v, 'Option "type" has incorrect value'));
    });
    it('invalid user adds error', async () => {
        const v = new FakeValidator();
        await NotificationBlock.validate(v, ref({ title: 't', message: 'm', type: NotificationType.INFO, user: 'BOGUS' }));
        assert.isTrue(has(v, 'Option "user" has incorrect value'));
    });
    it('ROLE user without role adds error', async () => {
        const v = new FakeValidator();
        await NotificationBlock.validate(v, ref({ title: 't', message: 'm', type: NotificationType.INFO, user: UserOption.ROLE }));
        assert.isTrue(has(v, 'Option "role" is empty'));
    });
    it('valid config yields no errors', async () => {
        const v = new FakeValidator();
        await NotificationBlock.validate(v, ref({ title: 't', message: 'm', type: NotificationType.INFO, user: UserOption.ALL }));
        assert.deepEqual(v.errors, []);
    });
});

describe('MultiSignBlock.validate branches', () => {
    it('blockType is multiSignBlock', () => {
        assert.equal(MultiSignBlock.blockType, 'multiSignBlock');
    });
    it('missing threshold adds error', async () => {
        const v = new FakeValidator();
        await MultiSignBlock.validate(v, ref({}));
        assert.isTrue(has(v, 'Option "threshold" is not set'));
    });
    it('threshold above 100 adds error', async () => {
        const v = new FakeValidator();
        await MultiSignBlock.validate(v, ref({ threshold: '150' }));
        assert.isTrue(has(v, 'value must be between 0 and 100'));
    });
    it('valid threshold yields no errors', async () => {
        const v = new FakeValidator();
        await MultiSignBlock.validate(v, ref({ threshold: '50' }));
        assert.deepEqual(v.errors, []);
    });
});

describe('SplitBlock.validate branches', () => {
    it('blockType is splitBlock', () => {
        assert.equal(SplitBlock.blockType, 'splitBlock');
    });
    it('missing threshold adds error', async () => {
        const v = new FakeValidator();
        await SplitBlock.validate(v, ref({}));
        assert.isTrue(has(v, 'Option "threshold" is not set'));
    });
    it('valid threshold yields no errors', async () => {
        const v = new FakeValidator();
        await SplitBlock.validate(v, ref({ threshold: '5' }));
        assert.deepEqual(v.errors, []);
    });
});

describe('ButtonBlockAddon.validate branches', () => {
    it('blockType is buttonBlockAddon', () => {
        assert.equal(ButtonBlockAddon.blockType, 'buttonBlockAddon');
    });
    it('missing name adds error', async () => {
        const v = new FakeValidator();
        await ButtonBlockAddon.validate(v, ref({}));
        assert.isTrue(has(v, 'Button name is empty'));
    });
    it('dialog missing title adds error', async () => {
        const v = new FakeValidator();
        await ButtonBlockAddon.validate(v, ref({ name: 'n', dialog: true, dialogOptions: { dialogResultFieldPath: 'p' } }));
        assert.isTrue(has(v, 'Dialog title is empty'));
    });
    it('dialog missing result field path adds error', async () => {
        const v = new FakeValidator();
        await ButtonBlockAddon.validate(v, ref({ name: 'n', dialog: true, dialogOptions: { dialogTitle: 't' } }));
        assert.isTrue(has(v, 'Dialog result field path is empty'));
    });
    it('valid config yields no errors', async () => {
        const v = new FakeValidator();
        await ButtonBlockAddon.validate(v, ref({ name: 'n' }));
        assert.deepEqual(v.errors, []);
    });
});

describe('DropdownBlockAddon.validate branches', () => {
    it('blockType is dropdownBlockAddon', () => {
        assert.equal(DropdownBlockAddon.blockType, 'dropdownBlockAddon');
    });
    it('missing optionName adds error', async () => {
        const v = new FakeValidator();
        await DropdownBlockAddon.validate(v, ref({ optionValue: 'v', field: 'f' }));
        assert.isTrue(has(v, 'Option name is empty'));
    });
    it('missing optionValue adds error', async () => {
        const v = new FakeValidator();
        await DropdownBlockAddon.validate(v, ref({ optionName: 'n', field: 'f' }));
        assert.isTrue(has(v, 'Option value is empty'));
    });
    it('missing field adds error', async () => {
        const v = new FakeValidator();
        await DropdownBlockAddon.validate(v, ref({ optionName: 'n', optionValue: 'v' }));
        assert.isTrue(has(v, 'Field is empty'));
    });
    it('valid config yields no errors', async () => {
        const v = new FakeValidator();
        await DropdownBlockAddon.validate(v, ref({ optionName: 'n', optionValue: 'v', field: 'f' }));
        assert.deepEqual(v.errors, []);
    });
});

describe('CommonBlock.validate (artifacts) branches', () => {
    it('null artifact entry adds error and returns false', async () => {
        const v = new FakeValidator();
        const result = await CommonBlock.validate(v, ref({ artifacts: [null] }));
        assert.isFalse(result);
        assert.isTrue(has(v, 'Artifact does not exist'));
    });
    it('missing artifact file adds error and returns false', async () => {
        const v = new FakeValidator({ artifactMissing: true });
        const result = await CommonBlock.validate(v, ref({ artifacts: [{ uuid: 'u1' }] }));
        assert.isFalse(result);
        assert.isTrue(has(v, 'Artifact with id "u1" does not exist'));
    });
    it('present artifact returns true with no errors', async () => {
        const v = new FakeValidator();
        const result = await CommonBlock.validate(v, ref({ artifacts: [{ uuid: 'u1' }] }));
        assert.isTrue(result);
        assert.deepEqual(v.errors, []);
    });
    it('no artifacts returns true', async () => {
        const v = new FakeValidator();
        const result = await CommonBlock.validate(v, ref({}));
        assert.isTrue(result);
    });
});

describe('PropertyValidator pure helpers', () => {
    it('selectValidator returns null for valid value', () => {
        assert.isNull(PropertyValidator.selectValidator('x', 'a', ['a', 'b']));
    });
    it('selectValidator returns message for invalid value', () => {
        const m = PropertyValidator.selectValidator('x', 'z', ['a', 'b']);
        assert.include(m, 'Option "x" must be one of');
    });
    it('inputValidator returns not-set for empty value', () => {
        assert.include(PropertyValidator.inputValidator('x', '', 'string'), 'is not set');
    });
    it('inputValidator returns type message for wrong type', () => {
        assert.include(PropertyValidator.inputValidator('x', 5, 'string'), 'must be a string');
    });
    it('inputValidator returns null for valid string', () => {
        assert.isNull(PropertyValidator.inputValidator('x', 'ok', 'string'));
    });
    it('inputValidator returns null when no type and value present', () => {
        assert.isNull(PropertyValidator.inputValidator('x', 5));
    });
});

describe('TokenOperationAddon (impact-addon).validate branches', () => {
    it('barrel exposes the impactAddon validator', () => {
        assert.equal(allValidators.find(b => b.blockType === 'impactAddon'), TokenOperationAddon);
    });
    it('blockType is impactAddon', () => {
        assert.equal(TokenOperationAddon.blockType, 'impactAddon');
    });
    it('missing amount adds error', async () => {
        const v = new FakeValidator();
        await TokenOperationAddon.validate(v, ref({ impactType: 'Primary Impacts' }));
        assert.isTrue(has(v, 'Option "amount" is not set'));
    });
    it('invalid impactType adds error', async () => {
        const v = new FakeValidator();
        await TokenOperationAddon.validate(v, ref({ amount: '1', impactType: 'bogus' }));
        assert.isTrue(has(v, 'Option "impactType" must be one of'));
    });
    it('valid config yields no errors', async () => {
        const v = new FakeValidator();
        await TokenOperationAddon.validate(v, ref({ amount: '1', impactType: 'Primary Impacts' }));
        assert.deepEqual(v.errors, []);
    });
});
