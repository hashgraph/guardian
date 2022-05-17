import { Policy } from "@entity/policy";
import { EventConfig, PolicyInputEventType, PolicyOutputEventType } from "./interfaces";

export class PolicyConverterUtils {
    public static PolicyConverter(policy: Policy): Policy {
        policy.config = PolicyConverterUtils.BlockConverter(policy.config);
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
            if (
                block.blockType == 'requestVcDocumentBlock' ||
                block.blockType == 'sendToGuardianBlock' ||
                block.blockType == 'externalDataBlock' ||
                block.blockType == 'aggregateDocumentBlock' ||
                block.blockType == 'reassigningBlock' ||
                block.blockType == 'timerBlock' ||
                block.blockType == 'mintDocumentBlock' ||
                block.blockType == 'retirementDocumentBlock' ||
                block.blockType == 'calculateContainerBlock' ||
                block.blockType == 'customLogicBlock'
            ) {
                if (next && !block.stopPropagation) {
                    const run: EventConfig = {
                        output: PolicyOutputEventType.RunEvent,
                        input: PolicyInputEventType.RunEvent,
                        source: block.tag,
                        target: next.tag,
                        disabled: !!block.stopPropagation,
                        actor: null
                    }
                    block.events.push(run);
                }
            }
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
        return block;
    }
}