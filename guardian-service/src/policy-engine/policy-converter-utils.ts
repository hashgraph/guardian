import { Policy } from "@entity/policy";
import { EventConfig, PolicyInputEventType, PolicyOutputEventType } from "./interfaces";

export class PolicyConverterUtils {
    public static PolicyConverter(policy: Policy): Policy {
        policy.config = PolicyConverterUtils.BlockConverter(policy.config);
        return policy;
    }

    private static BlockConverter(block: any): any {
        block = PolicyConverterUtils.v1_0_0(block);
        block = PolicyConverterUtils.v1_1_0(block);
        if (block.children && block.children.length) {
            for (let i = 0; i < block.children.length; i++) {
                block.children[i] = PolicyConverterUtils.BlockConverter(block.children[i]);
            }
        }
        return block;
    }

    private static v1_0_0(block: any): any {
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

    private static v1_1_0(block: any): any {
        if (!block.events) {
            const run: EventConfig = {
                output: PolicyOutputEventType.RunEvent,
                input: PolicyInputEventType.RunEvent,
                target: 'NEXT',
                disabled: !!block.stopPropagation,
                actor: null
            }
            block.events = [run];
            // if (block.dependencies && block.dependencies.length) {
            //     for (let dep of block.dependencies) {
            //         const refresh: EventConfig = {
            //             output: PolicyOutputEventType.RefreshEvent,
            //             input: PolicyInputEventType.RefreshEvent,
            //             target: dep,
            //             disabled: false,
            //             actor: null
            //         }
            //         block.events.push(refresh);
            //     }
            // }
            // if(block.followUser) {
            // }
        }
    }
}