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
                'externalTopicBlock'
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
    syntaxGroups: [
        {
            id: 'policy-id',
            name: 'Identifiers',
            color: '#3F51B5'
        },
        {
            id: 'policy-name',
            name: 'Names',
            color: '#9C27B0'
        },
        {
            id: 'policy-type',
            name: 'Types',
            color: '#795548'
        },
        {
            id: 'policy-version',
            name: 'Versions',
            color: 'darkgoldenrod'
        },
        {
            id: 'policy-user',
            name: 'Users',
            color: 'darkolivegreen'
        },
        {
            id: 'policy-tag',
            name: 'Tags',
            color: 'darkslategray'
        },
        {
            id: 'policy-complex',
            name: 'Complex Objects',
            color: 'orchid'
        },
        {
            id: 'policy-simple',
            name: 'Simple Objects',
            color: 'midnightblue'
        },
        {
            id: 'policy-date',
            name: 'Dates',
            color: 'salmon'
        },
        {
            id: 'policy-array',
            name: 'Arrays',
            color: 'darkslateblue'
        },
        {
            id: 'policy-flag',
            name: 'Flags',
            color: 'green'
        },
        {
            id: 'policy-error',
            name: 'Errors',
            color: 'crimson'
        },
    ]
}
