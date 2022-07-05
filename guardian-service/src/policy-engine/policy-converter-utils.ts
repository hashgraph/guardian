import { Policy } from '@entity/policy';
import { UserType } from '@guardian/interfaces';
import { EventConfig, PolicyInputEventType, PolicyOutputEventType, EventActor } from './interfaces';

/**
 * Policy converter utils
 */
export class PolicyConverterUtils {
    /**
     * Base version
     */
    public static readonly VERSION = '1.2.0';

    /**
     * Policy converter
     * @param policy
     * @constructor
     */
    public static PolicyConverter(policy: Policy): Policy {
        if (policy.codeVersion === PolicyConverterUtils.VERSION) {
            return policy;
        }

        policy.config = PolicyConverterUtils.BlockConverter(policy.config);
        policy.codeVersion = PolicyConverterUtils.VERSION;
        return policy;
    }

    /**
     * Block converter
     * @param block
     * @param parent
     * @param index
     * @param next
     * @param prev
     * @constructor
     * @private
     */
    private static BlockConverter(
        block: any,
        parent?: any,
        index?: any,
        next?: any,
        prev?: any
    ): any {

        block = PolicyConverterUtils.v1_0_0(block, parent, index, next, prev);
        block = PolicyConverterUtils.v1_1_0(block, parent, index, next, prev);
        block = PolicyConverterUtils.v1_2_0(block, parent, index, next, prev);

        if (block.children && block.children.length) {
            for (let i = 0; i < block.children.length; i++) {
                block.children[i] = PolicyConverterUtils.BlockConverter(
                    block.children[i], block, i, block.children[i + 1], block.children[i - 1]
                );
            }
        }
        return block;
    }

    /**
     * Create 1.0.0 version
     * @param block
     * @param parent
     * @param index
     * @param next
     * @param prev
     * @private
     */
    private static v1_0_0(
        block: any,
        parent?: any,
        index?: any,
        next?: any,
        prev?: any
    ): any {
        switch (block.blockType) {
            case 'interfaceDocumentsSource':
                block.blockType = 'interfaceDocumentsSourceBlock';
                break;
            case 'requestVcDocument':
                block.blockType = 'requestVcDocumentBlock';
                break;
            case 'sendToGuardian':
                block.blockType = 'sendToGuardianBlock';
                break;
            case 'interfaceAction':
                block.blockType = 'interfaceActionBlock';
                break;
            case 'mintDocument':
                block.blockType = 'mintDocumentBlock';
                break;
            case 'aggregateDocument':
                block.blockType = 'aggregateDocumentBlock';
                break;
            case 'wipeDocument':
                block.blockType = 'retirementDocumentBlock';
                break;
            default:
                return block;
        }
        return block;
    }

    /**
     * Create 1.1.0 version
     * @param block
     * @param parent
     * @param index
     * @param next
     * @param prev
     * @private
     */
    private static v1_1_0(
        block: any,
        parent?: any,
        index?: any,
        next?: any,
        prev?: any
    ): any {
        if (!block.events) {
            block.events = [];
            if (block.dependencies && block.dependencies.length) {
                for (const dep of block.dependencies) {
                    const refresh: EventConfig = {
                        output: PolicyOutputEventType.RefreshEvent,
                        input: PolicyInputEventType.RefreshEvent,
                        source: dep,
                        target: block.tag,
                        disabled: false,
                        actor: null
                    }
                    block.events.push(refresh);
                }
            }
            // if(block.followUser) {
            // }
        }
        if (block.blockType === 'interfaceActionBlock') {
            if (block.type === 'selector' &&
                block.uiMetaData &&
                block.uiMetaData.options
            ) {
                const options: any[] = block.uiMetaData.options;
                for (let i = 0; i < options.length; i++) {
                    if (!options[i].tag) {
                        options[i].tag = `Option_${i}`;
                    }
                    const run: EventConfig = {
                        output: options[i].tag,
                        input: PolicyInputEventType.RunEvent,
                        source: block.tag,
                        target: options[i].bindBlock,
                        disabled: false,
                        actor: (options[i].user === UserType.CURRENT ?
                            EventActor.EventInitiator :
                            EventActor.Owner)
                    }
                    block.events.push(run);
                }
            }
            if (block.type === 'dropdown') {
                const run: EventConfig = {
                    output: PolicyOutputEventType.DropdownEvent,
                    input: PolicyInputEventType.RunEvent,
                    source: block.tag,
                    target: block.bindBlock,
                    disabled: false,
                    actor: null
                }
                block.events.push(run);
            }
        }
        if (block.blockType === 'switchBlock') {
            if (block.conditions) {
                const conditions: any[] = block.conditions;
                for (let i = 0; i < conditions.length; i++) {
                    if (!conditions[i].tag) {
                        conditions[i].tag = `Condition_${i}`;
                    }
                    const run: EventConfig = {
                        output: conditions[i].tag,
                        input: PolicyInputEventType.RunEvent,
                        source: block.tag,
                        target: conditions[i].bindBlock,
                        disabled: false,
                        actor: null
                    }
                    block.events.push(run);
                }
            }
        }
        if (block.blockType === 'aggregateDocumentBlock') {
            if (block.timer) {
                const timer: EventConfig = {
                    output: PolicyOutputEventType.TimerEvent,
                    input: PolicyInputEventType.RunEvent,
                    source: block.timer,
                    target: block.tag,
                    disabled: false,
                    actor: null
                }
                block.events.push(timer);
            }
        }
        return block;
    }

    /**
     * Create 1.2.0 version
     * @param block
     * @param parent
     * @param index
     * @param next
     * @param prev
     * @private
     */
    private static v1_2_0(
        block: any,
        parent?: any,
        index?: any,
        next?: any,
        prev?: any
    ): any {
        if (block.blockType === 'interfaceActionBlock') {
            if (block.type === 'selector') {
                if (!block.uiMetaData) {
                    block.uiMetaData = {};
                }
                block.blockType = 'buttonBlock';
                block.uiMetaData.buttons = [];
                if (block.uiMetaData.options) {
                    const options: any[] = block.uiMetaData.options;
                    for (const option of options) {
                        block.uiMetaData.buttons.push({
                            tag: option.tag,
                            name: option.name,
                            type: 'selector',
                            filters: [],
                            field: block.field,
                            value: option.value,
                            uiClass: option.uiClass
                        });
                    }
                    delete block.uiMetaData.options;
                }
            }
        }
        return block;
    }
}
