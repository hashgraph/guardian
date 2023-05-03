/**
 * Block About
 * TODO: Create real block about
 */
export const BlockAbout = {
    'aggregateDocumentBlock': {
        'label': 'Aggregate Data',
        'title': 'Add \'Aggregate\' Block',
        'post': false,
        'get': false,
        'children': 'None',
        'control': 'Server',
        'input': [
            'PopEvent',
            'RunEvent',
            'TimerEvent'
        ],
        'output': [
            'RunEvent',
            'RefreshEvent'
        ],
        'defaultEvent': true,
        'properties': [
            {
                'name': 'disableUserGrouping',
                'label': 'Disable user grouping',
                'title': 'Disable user grouping',
                'type': 'Checkbox',
                'default': false
            },
            {
                'name': 'groupByFields',
                'label': 'Group By Fields',
                'title': 'Group By Fields',
                'type': 'Array',
                'items': {
                    'label': 'Field Path',
                    'value': '@fieldPath',
                    'properties': [
                        {
                            'name': 'fieldPath',
                            'label': 'Field Path',
                            'title': 'Field Path',
                            'type': 'Path'
                        }
                    ]
                }
            }
        ]
    },
    'calculateContainerBlock': {
        'label': 'Calculate',
        'title': 'Add \'Calculate\' Block',
        'post': false,
        'get': false,
        'children': 'Special',
        'control': 'Server',
        'input': [
            'RunEvent'
        ],
        'output': [
            'RunEvent',
            'RefreshEvent',
            'ErrorEvent'
        ],
        'defaultEvent': true
    },
    'calculateMathAddon': {
        'label': 'Math Addon',
        'title': 'Add \'Math\' Addon',
        'post': false,
        'get': false,
        'children': 'None',
        'control': 'Special',
        'input': null,
        'output': null,
        'defaultEvent': false
    },
    'customLogicBlock': {
        'label': 'Custom Logic',
        'title': 'Add \'Custom Logic\' Block',
        'post': false,
        'get': false,
        'children': 'Special',
        'control': 'Server',
        'input': [
            'RunEvent'
        ],
        'output': [
            'RunEvent',
            'RefreshEvent',
            'ErrorEvent'
        ],
        'defaultEvent': true
    },
    'documentsSourceAddon': {
        'label': 'Source',
        'title': 'Add \'DocumentsSourceAddon\' Addon',
        'post': false,
        'get': false,
        'children': 'Special',
        'control': 'Special',
        'input': null,
        'output': null,
        'defaultEvent': false
    },
    'externalDataBlock': {
        'label': 'External Data',
        'title': 'Add \'External Data\' Block',
        'post': true,
        'get': false,
        'children': 'None',
        'control': 'Server',
        'input': null,
        'output': [
            'RunEvent',
            'RefreshEvent',
            'ErrorEvent'
        ],
        'defaultEvent': true
    },
    'filtersAddon': {
        'label': 'Filters Addon',
        'title': 'Add \'Filters\' Addon',
        'post': true,
        'get': true,
        'children': 'Special',
        'control': 'Special',
        'input': null,
        'output': null,
        'defaultEvent': false
    },
    'informationBlock': {
        'label': 'Information',
        'title': 'Add \'Information\' Block',
        'post': false,
        'get': true,
        'children': 'None',
        'control': 'UI',
        'input': [
            'RunEvent',
            'RefreshEvent'
        ],
        'output': null,
        'defaultEvent': false
    },
    'interfaceContainerBlock': {
        'label': 'Container',
        'title': 'Add \'Container\' Block',
        'post': false,
        'get': true,
        'children': 'Any',
        'control': 'UI',
        'input': [
            'RunEvent',
            'RefreshEvent'
        ],
        'output': null,
        'defaultEvent': false
    },
    'interfaceActionBlock': {
        'label': 'Action',
        'title': 'Add \'Action\' Block',
        'post': true,
        'get': true,
        'children': 'Special',
        'control': 'UI',
        'input': [
            'RunEvent',
            'RefreshEvent'
        ],
        'output': null,
        'defaultEvent': false
    },
    'interfaceDocumentsSourceBlock': {
        'label': 'Documents',
        'title': 'Add \'Documents Source\' Block',
        'post': false,
        'get': true,
        'children': 'Special',
        'control': 'UI',
        'input': [
            'RunEvent',
            'RefreshEvent'
        ],
        'output': null,
        'defaultEvent': false
    },
    'interfaceStepBlock': {
        'label': 'Step',
        'title': 'Add \'Step\' Block',
        'post': false,
        'get': true,
        'children': 'Any',
        'control': 'UI',
        'input': [
            'RunEvent',
            'RefreshEvent'
        ],
        'output': [
            'RefreshEvent'
        ],
        'defaultEvent': false,
        'properties': [
            {
                'name': 'cyclic',
                'label': 'Cyclic',
                'title': 'Restart the block when the final step is reached?',
                'type': 'Checkbox'
            },
            {
                'name': 'finalBlocks',
                'label': 'Final steps',
                'title': 'Final steps',
                'type': 'MultipleSelect',
                'items': 'Children'
            },
            {
                'name': 'uiMetaData',
                'label': 'UI',
                'title': 'UI Properties',
                'type': 'Group',
                'properties': [
                    {
                        'name': 'title',
                        'label': 'Title',
                        'title': 'Title',
                        'type': 'Input'
                    }
                ]
            }
        ]
    },
    'mintDocumentBlock': {
        'label': 'Mint',
        'title': 'Add \'Mint\' Block',
        'post': false,
        'get': false,
        'children': 'None',
        'control': 'Server',
        'input': [
            'RunEvent',
            'AdditionalMintEvent'
        ],
        'output': [
            'RunEvent',
            'RefreshEvent',
            'ErrorEvent'
        ],
        'defaultEvent': true
    },
    'paginationAddon': {
        'label': 'Pagination',
        'title': 'Add \'Pagination\' Addon',
        'post': true,
        'get': true,
        'children': 'None',
        'control': 'Special',
        'input': null,
        'output': null,
        'defaultEvent': false
    },
    'policyRolesBlock': {
        'label': 'Roles',
        'title': 'Add \'Choice Of Roles\' Block',
        'post': true,
        'get': true,
        'children': 'None',
        'control': 'UI',
        'input': [
            'RunEvent',
            'RefreshEvent'
        ],
        'output': [
            'CreateGroup',
            'JoinGroup'
        ],
        'defaultEvent': false
    },
    'reassigningBlock': {
        'label': 'Reassigning',
        'title': 'Add \'Reassigning\' Block',
        'post': false,
        'get': false,
        'children': 'None',
        'control': 'Server',
        'input': [
            'RunEvent'
        ],
        'output': [
            'RunEvent',
            'RefreshEvent',
            'ErrorEvent'
        ],
        'defaultEvent': true
    },
    'reportBlock': {
        'label': 'Report',
        'title': 'Add \'Report\' Block',
        'post': true,
        'get': true,
        'children': 'Special',
        'control': 'UI',
        'input': [
            'RunEvent',
            'RefreshEvent'
        ],
        'output': null,
        'defaultEvent': false
    },
    'reportItemBlock': {
        'label': 'Report Item',
        'title': 'Add \'Report Item\' Block',
        'post': false,
        'get': false,
        'children': 'None',
        'control': 'Special',
        'input': null,
        'output': null,
        'defaultEvent': false
    },
    'retirementDocumentBlock': {
        'label': 'Wipe',
        'title': 'Add \'Wipe\' Block',
        'post': false,
        'get': false,
        'children': 'None',
        'control': 'Server',
        'input': [
            'RunEvent'
        ],
        'output': [
            'RunEvent',
            'RefreshEvent',
            'ErrorEvent'
        ],
        'defaultEvent': true
    },
    'requestVcDocumentBlock': {
        'label': 'Request',
        'title': 'Add \'Request\' Block',
        'post': true,
        'get': true,
        'children': 'Special',
        'control': 'UI',
        'input': [
            'RunEvent',
            'RefreshEvent',
            'RestoreEvent'
        ],
        'output': [
            'RunEvent',
            'RefreshEvent'
        ],
        'defaultEvent': true
    },
    'sendToGuardianBlock': {
        'label': 'Send',
        'title': 'Add \'Send\' Block',
        'post': false,
        'get': false,
        'children': 'None',
        'control': 'Server',
        'input': [
            'RunEvent'
        ],
        'output': [
            'RunEvent',
            'RefreshEvent',
            'ErrorEvent'
        ],
        'defaultEvent': true
    },
    'switchBlock': {
        'label': 'Switch',
        'title': 'Add \'Switch\' Block',
        'post': false,
        'get': false,
        'children': 'None',
        'control': 'Server',
        'input': [
            'RunEvent'
        ],
        'output': [
            'RefreshEvent'
        ],
        'defaultEvent': false
    },
    'timerBlock': {
        'label': 'Timer',
        'title': 'Add \'Timer\' Block',
        'post': false,
        'get': false,
        'children': 'None',
        'control': 'Special',
        'input': [
            'RunEvent',
            'StartTimerEvent',
            'StopTimerEvent'
        ],
        'output': [
            'RunEvent',
            'RefreshEvent',
            'TimerEvent'
        ],
        'defaultEvent': true
    },
    'revokeBlock': {
        'label': 'Revoke Document',
        'title': 'Add \'Revoke\' Block',
        'post': false,
        'get': false,
        'children': 'None',
        'control': 'Server',
        'input': [
            'RunEvent'
        ],
        'output': [
            'RunEvent',
            'ErrorEvent'
        ],
        'defaultEvent': true
    },
    'setRelationshipsBlock': {
        'label': 'Set Relationships',
        'title': 'Add \'Relationships\' Block',
        'post': false,
        'get': false,
        'children': 'Special',
        'control': 'Server',
        'input': [
            'RunEvent'
        ],
        'output': [
            'RunEvent'
        ],
        'defaultEvent': true,
        'properties': [
            {
                'name': 'includeAccounts',
                'label': 'Include Accounts',
                'title': 'Include Related Documents Accounts',
                'type': 'Checkbox',
                'default': false
            },
            {
                'name': 'includeTokens',
                'label': 'Include Tokens',
                'title': 'Include Related Documents Tokens',
                'type': 'Checkbox',
                'default': false
            },
            {
                'name': 'changeOwner',
                'label': 'Change Owner',
                'title': 'Change Document Owner',
                'type': 'Checkbox',
                'default': false
            }
        ]
    },
    'buttonBlock': {
        'label': 'Button',
        'title': 'Add \'Button\' Block',
        'post': true,
        'get': true,
        'children': 'Special',
        'control': 'UI',
        'input': [
            'RunEvent'
        ],
        'output': null,
        'defaultEvent': false
    },
    'tokenActionBlock': {
        'label': 'Token Action',
        'title': 'Add \'Token Action\' Block',
        'post': false,
        'get': false,
        'children': 'None',
        'control': 'Server',
        'input': [
            'RunEvent'
        ],
        'output': [
            'RunEvent',
            'RefreshEvent',
            'ErrorEvent'
        ],
        'defaultEvent': true
    },
    'documentValidatorBlock': {
        'label': 'Validator',
        'title': 'Add \'Validator\' Block',
        'post': false,
        'get': false,
        'children': 'None',
        'control': 'Special',
        'input': [
            'RunEvent'
        ],
        'output': [
            'RunEvent',
            'RefreshEvent',
            'ErrorEvent'
        ],
        'defaultEvent': true
    },
    'tokenConfirmationBlock': {
        'label': 'Token Confirmation',
        'title': 'Add \'Token Confirmation\' Block',
        'post': true,
        'get': true,
        'children': 'None',
        'control': 'UI',
        'input': [
            'RunEvent'
        ],
        'output': [
            'Confirm',
            'RefreshEvent',
            'ErrorEvent'
        ],
        'defaultEvent': false
    },
    'groupManagerBlock': {
        'label': 'Group Manager',
        'title': 'Add \'Group Manager\' Block',
        'post': true,
        'get': true,
        'children': 'None',
        'control': 'UI',
        'input': [
            'RunEvent',
            'RefreshEvent'
        ],
        'output': null,
        'defaultEvent': false
    },
    'multiSignBlock': {
        'label': 'Multiple Signature',
        'title': 'Add \'Multiple Signature\' Block',
        'post': true,
        'get': true,
        'children': 'None',
        'control': 'UI',
        'input': [
            'RunEvent'
        ],
        'output': [
            'RefreshEvent',
            'SignatureQuorumReachedEvent',
            'SignatureSetInsufficientEvent'
        ],
        'defaultEvent': false,
        'properties': [
            {
                'name': 'threshold',
                'label': 'Threshold (%)',
                'title': 'Number of signatures required to move to the next step, as a percentage of the total number of users in the group.',
                'type': 'Input',
                'default': '50'
            }
        ]
    },
    'calculateMathVariables': {
        'label': 'Math Variables',
        'title': 'Add \'Math\' Variables',
        'post': false,
        'get': false,
        'children': 'None',
        'control': 'Special',
        'input': null,
        'output': null,
        'defaultEvent': false,
        'properties': [
            {
                'name': 'sourceSchema',
                'label': 'Source schema',
                'title': 'Source schema',
                'type': 'Schemas'
            },
            {
                'name': 'onlyOwnDocuments',
                'label': 'Owned by User',
                'title': 'Owned by User',
                'type': 'Checkbox'
            },
            {
                'name': 'onlyOwnByGroupDocuments',
                'label': 'Owned by Group',
                'title': 'Owned by Group',
                'type': 'Checkbox'
            },
            {
                'name': 'onlyAssignDocuments',
                'label': 'Assigned to User',
                'title': 'Assigned to User',
                'type': 'Checkbox'
            },
            {
                'name': 'onlyAssignByGroupDocuments',
                'label': 'Assigned to Group',
                'title': 'Assigned to Group',
                'type': 'Checkbox'
            },
            {
                'name': 'selectors',
                'label': 'Selectors',
                'title': 'Selectors',
                'type': 'Array',
                'items': {
                    'label': 'Selector',
                    'value': '@sourceField @selectorType @comparisonValue',
                    'properties': [
                        {
                            'name': 'sourceField',
                            'label': 'Source field',
                            'title': 'Source field',
                            'type': 'Path'
                        },
                        {
                            'name': 'selectorType',
                            'label': 'Selector type',
                            'title': 'Selector type',
                            'type': 'Select',
                            'items': [
                                {
                                    'label': 'Equal',
                                    'value': 'equal'
                                },
                                {
                                    'label': 'Not Equal',
                                    'value': 'not_equal'
                                },
                                {
                                    'label': 'In',
                                    'value': 'in'
                                },
                                {
                                    'label': 'Not In',
                                    'value': 'not_in'
                                }
                            ],
                            'default': 'equal'
                        },
                        {
                            'name': 'comparisonValue',
                            'label': 'Comparison value',
                            'title': 'Comparison value',
                            'type': 'Input'
                        },
                        {
                            'name': 'comparisonValueType',
                            'label': 'Comparison value type',
                            'title': 'Comparison value type',
                            'type': 'Select',
                            'items': [
                                {
                                    'label': 'Constanta',
                                    'value': 'const'
                                },
                                {
                                    'label': 'Variable',
                                    'value': 'var'
                                }
                            ],
                            'default': 'const'
                        }
                    ]
                }
            },
            {
                'name': 'variables',
                'label': 'Variables',
                'title': 'Variables',
                'type': 'Array',
                'items': {
                    'label': 'Variable',
                    'value': 'var @variableName = @variablePath',
                    'properties': [
                        {
                            'name': 'variableName',
                            'label': 'Variable name',
                            'title': 'Variable name',
                            'type': 'Input'
                        },
                        {
                            'name': 'variablePath',
                            'label': 'Variable Path',
                            'title': 'Variable Path',
                            'type': 'Path'
                        }
                    ]
                }
            }
        ]
    },
    'createTokenBlock': {
        'label': 'Create Token',
        'title': 'Add \'Create Token\' Block',
        'post': true,
        'get': true,
        'children': 'None',
        'control': 'UI',
        'input': [
            'RunEvent'
        ],
        'output': [
            'RunEvent',
            'RefreshEvent'
        ],
        'defaultEvent': true
    },
    'splitBlock': {
        'label': 'Split Block',
        'title': 'Add \'Split\' Block',
        'post': false,
        'get': false,
        'children': 'None',
        'control': 'Server',
        'input': [
            'RunEvent'
        ],
        'output': [
            'RunEvent',
            'RefreshEvent',
            'ErrorEvent'
        ],
        'defaultEvent': true,
        'properties': [
            {
                'name': 'threshold',
                'label': 'Threshold',
                'title': 'Threshold',
                'type': 'Input'
            },
            {
                'name': 'sourceField',
                'label': 'Source field',
                'title': 'Source field',
                'type': 'Path'
            }
        ]
    },
    'impactAddon': {
        'label': 'Impact',
        'title': 'Add \'Impact\'',
        'post': false,
        'get': false,
        'children': 'None',
        'control': 'Special',
        'input': null,
        'output': null,
        'defaultEvent': false,
        'properties': [
            {
                'name': 'impactType',
                'label': 'Impact type',
                'title': 'Impact type',
                'type': 'Select',
                'items': [
                    {
                        'label': 'Primary Impacts',
                        'value': 'Primary Impacts'
                    },
                    {
                        'label': 'Secondary Impacts',
                        'value': 'Secondary Impacts'
                    }
                ],
                'default': 'Secondary Impacts',
                'required': true
            },
            {
                'name': 'label',
                'label': 'Label',
                'title': 'Label',
                'type': 'Input'
            },
            {
                'name': 'description',
                'label': 'Description',
                'title': 'Description',
                'type': 'Input'
            },
            {
                'name': 'amount',
                'label': 'Amount (Formula)',
                'title': 'Amount (Formula)',
                'required': true,
                'type': 'Input'
            },
            {
                'name': 'unit',
                'label': 'Unit',
                'title': 'Unit',
                'type': 'Input'
            }
        ]
    },
    'httpRequestBlock': {
        'label': 'Request data',
        'title': 'Add \'Request Data\' Block',
        'post': false,
        'get': false,
        'children': 'None',
        'control': 'Server',
        'input': [
            'RunEvent'
        ],
        'output': [
            'RunEvent',
            'RefreshEvent',
            'ErrorEvent'
        ],
        'defaultEvent': true
    },
    'historyAddon': {
        'label': 'History',
        'title': 'Add \'History\' Addon',
        'post': false,
        'get': false,
        'children': 'None',
        'control': 'Special',
        'input': null,
        'output': null,
        'defaultEvent': false,
        'properties': [
            {
                'name': 'timelineLabelPath',
                'label': 'Timeline Label Path',
                'title': 'Timeline unit label path',
                'type': 'Path',
                'default': ''
            },
            {
                'name': 'timelineDescriptionPath',
                'label': 'Timeline Description Path',
                'title': 'Timeline unit description',
                'type': 'Path',
                'default': ''
            }
        ]
    },
    'selectiveAttributes': {
        'label': 'Selective Attributes',
        'title': 'Add \'Selective Attributes\' Addon',
        'post': false,
        'get': false,
        'children': 'None',
        'control': 'Special',
        'input': null,
        'output': null,
        'defaultEvent': false,
        'properties': [
            {
                'name': 'attributes',
                'label': 'Attributes To Select',
                'title': 'Attributes To Select',
                'type': 'Array',
                'items': {
                    'label': 'Attribute Path',
                    'value': '@attributePath',
                    'properties': [
                        {
                            'name': 'attributePath',
                            'label': 'Attribute Path',
                            'title': 'Attribute Path',
                            'type': 'Input'
                        }
                    ]
                }
            }
        ]
    },
    'tagsManager': {
        'label': 'Tags Manager',
        'title': 'Add \'Tags Manager\' Block',
        'post': true,
        'get': true,
        'children': 'None',
        'control': 'UI',
        'input': null,
        'output': null,
        'defaultEvent': false
    }
}

/**
 * Block About (String)
 */
export const BlockAboutString = JSON.stringify(BlockAbout);
