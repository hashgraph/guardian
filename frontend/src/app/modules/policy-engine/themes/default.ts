import { DEFAULT_SYNTAX_GROUPS } from "./default-syntax-groups";

export const defaultTheme = {
    id: 1,
    uuid: '00000000-0000-0000-0000-000000000001',
    readonly: true,
    name: 'Default',
    rules: [
        {
            description: 'UI Components',
            text: '#000',
            background: '#efe5fc',
            border: '#c396fa',
            shape: '0',
            borderWidth: '2px',
            filterType: 'type',
            filterValue: [
                'interfaceActionBlock',
                'buttonBlock',
                'interfaceContainerBlock',
                'createTokenBlock',
                'interfaceDocumentsSourceBlock',
                'groupManagerBlock',
                'informationBlock',
                'multiSignBlock',
                'reportBlock',
                'requestVcDocumentBlock',
                'uploadVcDocumentBlock',
                'policyRolesBlock',
                'interfaceStepBlock',
                'tagsManager',
                'tokenConfirmationBlock',
                'externalTopicBlock',
                'messagesReportBlock'
            ]
        },
        {
            description: 'Server Components',
            text: '#000',
            background: '#e2f9fe',
            border: '#7bd0e3',
            shape: '2',
            borderWidth: '2px',
            filterType: 'type',
            filterValue: [
                'aggregateDocumentBlock',
                'calculateContainerBlock',
                'customLogicBlock',
                'externalDataBlock',
                'mintDocumentBlock',
                'reassigningBlock',
                'httpRequestBlock',
                'revokeBlock',
                'revocationBlock',
                'sendToGuardianBlock',
                'setRelationshipsBlock',
                'splitBlock',
                'switchBlock',
                'tokenActionBlock',
                'retirementDocumentBlock',
                'notificationBlock',
                'extractDataBlock'
            ]
        },
        {
            description: 'Addons',
            text: '#000',
            background: '#ffeeda',
            border: '#f9b465',
            shape: '1',
            borderWidth: '2px',
            filterType: 'type',
            filterValue: [
                'filtersAddon',
                'historyAddon',
                'impactAddon',
                'calculateMathAddon',
                'calculateMathVariables',
                'paginationAddon',
                'reportItemBlock',
                'selectiveAttributes',
                'documentsSourceAddon',
                'timerBlock',
                'documentValidatorBlock'
            ]
        }
    ],
    'syntaxGroups': DEFAULT_SYNTAX_GROUPS,
}
