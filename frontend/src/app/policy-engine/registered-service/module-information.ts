import {
    BlockType,
    BlockGroup,
    BlockHeaders,
    IBlockAbout,
    PolicyBlockModel,
    IBlockSetting,
    ChildrenType,
    ControlType,
    PolicyModuleModel
} from "../structures";

const Module: IBlockSetting = {
    type: BlockType.Module,
    icon: 'folder',
    group: BlockGroup.Module,
    header: BlockHeaders.Module,
    factory: null,
    property: null,
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
        { type: BlockType.SendToGuardian },
        { type: BlockType.ExternalData },
        { type: BlockType.AggregateDocument },
        { type: BlockType.ReassigningBlock },
        { type: BlockType.TimerBlock },
        { type: BlockType.Mint },
        { type: BlockType.Wipe },
        { type: BlockType.Calculate },
        { type: BlockType.CustomLogicBlock },
        { type: BlockType.Report },
        { type: BlockType.RevokeBlock },
        { type: BlockType.SetRelationshipsBlock },
        { type: BlockType.ButtonBlock },
        { type: BlockType.TokenActionBlock },
        { type: BlockType.TokenConfirmationBlock },
        { type: BlockType.DocumentValidatorBlock },
        { type: BlockType.MultiSignBlock },
        { type: BlockType.CreateToken },
        { type: BlockType.SplitBlock }
    ],
    about: {
        post: false,
        get: false,
        input: (value: any, block: PolicyModuleModel): string[] => {
            return block.inputEvents.map(e => e.name);
        },
        output: (value: any, block: PolicyModuleModel): string[] => {
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