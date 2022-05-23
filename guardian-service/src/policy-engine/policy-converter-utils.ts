import { Policy } from "@entity/policy";
import { EventConfig, PolicyInputEventType, PolicyOutputEventType } from "./interfaces";

export class PolicyConverterUtils {
    public static readonly VERSION = '1.1.0';

    public static PolicyConverter(policy: Policy): Policy {
        if (policy.codeVersion === PolicyConverterUtils.VERSION) {
            return policy;
        }

        policy.config = PolicyConverterUtils.BlockConverter(policy.config);
        policy.codeVersion = PolicyConverterUtils.VERSION;
        return policy;
    }

    private static BlockConverter(
        block: any,
        parent?: any,
        index?: any,
        next?: any,
        prev?: any
    ): any {

        block = PolicyConverterUtils.v1_0_0(block, parent, index, next, prev);
        block = PolicyConverterUtils.v1_1_0(block, parent, index, next, prev);

        if (block.children && block.children.length) {
            for (let i = 0; i < block.children.length; i++) {
                block.children[i] = PolicyConverterUtils.BlockConverter(
                    block.children[i], block, i, block.children[i + 1], block.children[i - 1]
                );
            }
        }
        return block;
    }

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
        }
        return block;
    }

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
                for (let dep of block.dependencies) {
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
        if (block.blockType == 'interfaceActionBlock') {
            if (block.type == 'selector' &&
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
                        actor: null
                    }
                    block.events.push(run);
                }
            }
            if (block.type == 'dropdown') {
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
        if (block.blockType == 'switchBlock') {
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
        if (block.blockType == 'aggregateDocumentBlock') {
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
}