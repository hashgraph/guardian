import { ModuleComponent } from '../policy-configuration/blocks/module/module.component';
import { ContainerBlockComponent } from '../policy-viewer/blocks/container-block/container-block.component';
import { BlockType } from '@guardian/interfaces';
import { BlockGroup, BlockHeaders, ChildrenType, ControlType, IBlockSetting, PolicyModule } from '../structures';
import { PolicyFolder } from '../structures/policy-models/interfaces/types';

const Module: IBlockSetting = {
    type: BlockType.Module,
    icon: 'folder',
    group: BlockGroup.Module,
    header: BlockHeaders.Module,
    factory: ContainerBlockComponent,
    property: ModuleComponent,
    code: null,
    allowedChildren: [
        { type: BlockType.Information },
        { type: BlockType.PolicyRoles },
        { type: BlockType.GroupManagerBlock },
        { type: BlockType.Action },
        { type: BlockType.Container },
        { type: BlockType.Step },
        { type: BlockType.Switch },
        { type: BlockType.HttpRequest },
        { type: BlockType.DocumentsViewer },
        { type: BlockType.Request },
        { type: BlockType.Upload },
        { type: BlockType.SendToGuardian },
        { type: BlockType.ExternalData },
        { type: BlockType.AggregateDocument },
        { type: BlockType.ReassigningBlock },
        { type: BlockType.TimerBlock },
        { type: BlockType.Mint },
        { type: BlockType.Wipe },
        { type: BlockType.MathBlock },
        { type: BlockType.Calculate },
        { type: BlockType.CustomLogicBlock },
        { type: BlockType.Report },
        { type: BlockType.RevokeBlock },
        { type: BlockType.RevocationBlock },
        { type: BlockType.SetRelationshipsBlock },
        { type: BlockType.ButtonBlock },
        { type: BlockType.TransformationButtonBlock },
        { type: BlockType.IntegrationButtonBlock },
        { type: BlockType.TokenActionBlock },
        { type: BlockType.TokenConfirmationBlock },
        { type: BlockType.DocumentValidatorBlock },
        { type: BlockType.MultiSignBlock },
        { type: BlockType.CreateToken },
        { type: BlockType.SplitBlock },
        { type: BlockType.ExternalTopic },
        { type: BlockType.MessagesReportBlock },
        { type: BlockType.NotificationBlock },
        { type: BlockType.ExtractDataBlock },
    ],
    about: {
        post: false,
        get: false,
        input: (value: any, block: PolicyModule, module?: PolicyFolder): string[] => {
            if (block === module) {
                return block.outputEvents.map(e => e.name);
            }
            return block.inputEvents.map(e => e.name);
        },
        output: (value: any, block: PolicyModule, module?: PolicyFolder): string[] => {
            if (block === module) {
                return block.inputEvents.map(e => e.name);
            }
            return block.outputEvents.map(e => e.name);
        },
        children: ChildrenType.Any,
        control: ControlType.None,
        defaultEvent: false
    }
}

export default [
    Module,
];
