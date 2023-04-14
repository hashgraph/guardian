export const defaultTheme = {
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
            filterOperation: 'in',
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
                'policyRolesBlock',
                'interfaceStepBlock',
                'tagsManager',
                'tokenConfirmationBlock'
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
            filterOperation: 'in',
            filterValue: [
                'aggregateDocumentBlock',
                'calculateContainerBlock',
                'customLogicBlock',
                'externalDataBlock',
                'mintDocumentBlock',
                'reassigningBlock',
                'httpRequestBlock',
                'revokeBlock',
                'sendToGuardianBlock',
                'setRelationshipsBlock',
                'splitBlock',
                'switchBlock',
                'tokenActionBlock',
                'retirementDocumentBlock'
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
            filterOperation: 'in',
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
    ]
}






