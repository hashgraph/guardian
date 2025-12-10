import {
    BlockType,
    GenerateUUIDv4,
    IGridConfig,
    ISchemaRoleConfig,
    IWizardConfig,
    IWizardSchemaConfig,
    IWizardTrustChainConfig,
} from '@guardian/interfaces';

/**
 * Policy wizard helper
 */
export class PolicyWizardHelper {
    /**
     * Block counter
     */
    private blockCounter: number = 0;

    /**
     * Generate block tag
     * @returns Tag
     */
    private generateBlockTag(role: string, blockType: BlockType) {
        this.blockCounter++;
        return `${role}_${blockType}_${this.blockCounter}`;
    }

    /**
     * Create policy config
     * @param wizardConfig config
     * @returns Policy config
     */
    public createPolicyConfig(wizardConfig: IWizardConfig): any {
        this.blockCounter = 0;
        const { roles, schemas, trustChain } = wizardConfig;
        const root: any = {
            id: GenerateUUIDv4(),
            blockType: BlockType.Container,
            permissions: ['ANY_ROLE'],
            children: [this.getChooseRoleBlock(roles)],
        };
        const roleContainers: any = {};
        const roleTabContainers: any = {};
        roles.forEach((role) => {
            roleContainers[role] = this.getRoleContainer(role);
            roleTabContainers[role] = roleContainers[role];
        });
        const schemaRefreshEvents: {
            [key: string]: {
                sendBlocks: { tag: string; events?: any[] }[];
                gridBlockTags: string[];
                mintBlocks: { tag: string; events?: any[] }[];
                vpGridBlockTags: string[];
            };
        } = {};
        const approveRejectInitialSteps: {
            [key: string]: {
                approveBlockTags: string[];
                rejectBlockTags: string[];
            };
        } = {};
        for (const schema of schemas) {
            const approveBlockTags = [];
            const rejectBlockTags = [];
            approveRejectInitialSteps[schema.iri] = {
                approveBlockTags,
                rejectBlockTags,
            };
            for (const roleInitialSchemaFor of schema.initialRolesFor) {
                const stepContainer = this.getRoleStep(roleInitialSchemaFor);
                roleContainers[roleInitialSchemaFor] = stepContainer;
                const [_, rejectInfoBlockTag] = this.createInitialSchemaSteps(
                    roleInitialSchemaFor,
                    stepContainer,
                    roleTabContainers[roleInitialSchemaFor],
                    schema,
                    schemaRefreshEvents
                );
                approveBlockTags.push(
                    roleTabContainers[roleInitialSchemaFor].tag
                );
                rejectBlockTags.push(rejectInfoBlockTag);
            }
        }

        for (const schema of schemas) {
            for (const roleConfig of schema.rolesConfig) {
                const roleSchemaTabContainer =
                    this.putSchemasStepsIntoContainer(
                        roleConfig,
                        schema,
                        schemas,
                        this.getTabContainer(roleConfig.role, schema.name),
                        approveRejectInitialSteps[schema.iri]?.approveBlockTags,
                        approveRejectInitialSteps[schema.iri]?.rejectBlockTags,
                        schemaRefreshEvents
                    );
                roleTabContainers[roleConfig.role].children.push(
                    roleSchemaTabContainer
                );
            }
        }

        for (const trustChainConfig of trustChain) {
            const [roleTrustChainTabContainer, trustChainTag] =
                this.putTrustChainStepsIntoContainer(
                    trustChainConfig,
                    schemas,
                    this.getTabContainer(trustChainConfig.role, 'Trust Chain')
                );
            const [vpGridTabContainer, vpGrid] = this.createVPGrid(
                trustChainConfig,
                trustChainTag,
                this.getTabContainer(trustChainConfig.role, 'Token History')
            );
            if (schemaRefreshEvents[trustChainConfig.mintSchemaIri]) {
                schemaRefreshEvents[
                    trustChainConfig.mintSchemaIri
                ].vpGridBlockTags.push(vpGrid.tag);
            }
            roleTabContainers[trustChainConfig.role].children.push(
                vpGridTabContainer,
                roleTrustChainTabContainer
            );
        }

        for (const eventConfigs of Object.entries(schemaRefreshEvents)) {
            this.addRefreshEvent(
                eventConfigs[1].sendBlocks,
                eventConfigs[1].gridBlockTags
            );
            this.addRefreshEvent(
                eventConfigs[1].mintBlocks,
                eventConfigs[1].vpGridBlockTags
            );
        }

        for (const roleContainer of Object.values(roleContainers)) {
            root.children.push(roleContainer);
        }

        return root;
    }

    /**
     * Create initial steps
     * @param role Role
     * @param container Container
     * @param schemaConfig Schema config
     * @returns Container
     */
    private createInitialSchemaSteps(
        role: string,
        container: any,
        roleTabContainer: any,
        schemaConfig: IWizardSchemaConfig,
        schemaRefreshEvents: {
            [key: string]: {
                sendBlocks: { tag: string; events?: any[] }[];
                gridBlockTags: string[];
                mintBlocks: { tag: string; events?: any[] }[];
                vpGridBlockTags: string[];
            };
        }
    ) {
        schemaRefreshEvents[schemaConfig.iri] ||= {
            gridBlockTags: [],
            sendBlocks: [],
            mintBlocks: [],
            vpGridBlockTags: [],
        };
        const requestDocument = this.getRequestDocumentBlock(
            role,
            schemaConfig.iri
        );
        const sendBlock = this.getDocumentSendBlock(
            role,
            false,
            schemaConfig.isApproveEnable
        );
        container.children?.push(requestDocument, sendBlock);
        schemaRefreshEvents[schemaConfig.iri].sendBlocks.push(sendBlock);
        if (schemaConfig.isApproveEnable) {
            const infoBlock = this.getInfoBlock(
                role,
                'Submitted to approve',
                'The page will be automatically refreshed'
            );
            container.children?.push(infoBlock);
        } else if (schemaConfig.isMintSchema) {
            const mintBlock = this.getMintBlock(
                role,
                schemaConfig.mintOptions.tokenId,
                schemaConfig.mintOptions.rule
            );
            schemaRefreshEvents[schemaConfig.iri].mintBlocks.push(mintBlock);
            container.children?.push(mintBlock);
        }
        container?.children.push(roleTabContainer);
        let rejectInfoBlockTag;
        if (schemaConfig.isApproveEnable) {
            const rejectInfoBlock = this.getInfoBlock(
                role,
                'Rejected',
                'Document was rejected'
            );
            rejectInfoBlockTag = rejectInfoBlock.tag;
            container.children?.push(rejectInfoBlock);
        }
        return [container, rejectInfoBlockTag];
    }

    /**
     * Create schema container
     * @param roleConfig Role config
     * @param schemaConfig Schema config
     * @param schemaConfigs Schema configs
     * @param container Container
     * @param approveBtnTag Approve button tag
     * @param rejectBtnTag Reject button tag
     * @returns Container
     */
    private putSchemasStepsIntoContainer(
        roleConfig: ISchemaRoleConfig,
        schemaConfig: IWizardSchemaConfig,
        schemaConfigs: IWizardSchemaConfig[],
        container: any,
        approvedBlockTags: string[] = [],
        rejectedBlockTags: string[] = [],
        schemaRefreshEvents: {
            [key: string]: {
                sendBlocks: { tag: string; events?: any[] }[];
                gridBlockTags: string[];
                mintBlocks: { tag: string; events?: any[] }[];
                vpGridBlockTags: string[];
            };
        }
    ) {
        const dependencySchema = schemaConfigs.find(
            (schema) => schema.iri === schemaConfig.dependencySchemaIri
        );
        const relationshipSchema = schemaConfigs.find(
            (schema) => schema.iri === schemaConfig.relationshipsSchemaIri
        );
        const gridBlock = this.getDocumentsGrid(
            roleConfig.role,
            roleConfig.gridColumns
        );
        container.children?.push(gridBlock);
        schemaRefreshEvents[schemaConfig.iri] ||= {
            sendBlocks: [],
            gridBlockTags: [],
            mintBlocks: [],
            vpGridBlockTags: [],
        };
        schemaRefreshEvents[schemaConfig.iri].gridBlockTags.push(gridBlock.tag);
        let createDependencySchemaAddonTag;
        if (schemaConfig.isApproveEnable) {
            const toApproveOrRejectAddon = this.getDocumentsSourceAddon(
                roleConfig.role,
                schemaConfig.iri,
                !roleConfig.isApprover,
                [
                    {
                        value: 'Waiting for approval',
                        field: 'option.status',
                        type: 'equal',
                    },
                ]
            );
            const approvedAddon = this.getDocumentsSourceAddon(
                roleConfig.role,
                schemaConfig.iri,
                !roleConfig.isApprover,
                [
                    {
                        value: 'approved_entity',
                        field: 'type',
                        type: 'equal',
                    },
                ]
            );
            const rejectedAddon = this.getDocumentsSourceAddon(
                roleConfig.role,
                schemaConfig.iri,
                !roleConfig.isApprover,
                [
                    {
                        value: 'rejected_entity',
                        field: 'type',
                        type: 'equal',
                    },
                ]
            );
            createDependencySchemaAddonTag = approvedAddon.tag;
            gridBlock?.children?.push(
                toApproveOrRejectAddon,
                approvedAddon,
                rejectedAddon
            );
            if (roleConfig.isApprover) {
                const saveDocumentApprove =
                    this.getChangeDocumentStatusSendBlock(
                        roleConfig.role,
                        'Approved'
                    );
                const saveDocumentReject =
                    this.getChangeDocumentStatusSendBlock(
                        roleConfig.role,
                        'Rejected'
                    );
                const buttonsBlock = this.getApproveRejectButtonsBlock(
                    roleConfig.role,
                    saveDocumentApprove.tag,
                    saveDocumentReject.tag
                );
                const approveRejectField = this.getApproveRejectField(
                    buttonsBlock.tag,
                    toApproveOrRejectAddon.tag
                );
                gridBlock.uiMetaData.fields.push(approveRejectField);
                const sendApprovedBlock = this.getDocumentSendBlock(
                    roleConfig.role,
                    !schemaConfig.isMintSchema,
                    false,
                    'approved_entity',
                    approvedBlockTags
                );
                schemaRefreshEvents[schemaConfig.iri].sendBlocks.push(
                    sendApprovedBlock
                );
                container.children?.push(
                    buttonsBlock,
                    saveDocumentApprove,
                    this.getReassignBlock(roleConfig.role),
                    sendApprovedBlock
                );
                if (schemaConfig.isMintSchema) {
                    const mintBlock = this.getMintBlock(
                        roleConfig.role,
                        schemaConfig.mintOptions.tokenId,
                        schemaConfig.mintOptions.rule
                    );
                    schemaRefreshEvents[schemaConfig.iri].mintBlocks.push(
                        mintBlock
                    );
                    container.children?.push(mintBlock);
                }
                const sendRejectedBlock = this.getDocumentSendBlock(
                    roleConfig.role,
                    true,
                    false,
                    'rejected_entity',
                    rejectedBlockTags
                );
                schemaRefreshEvents[schemaConfig.iri].sendBlocks.push(
                    sendRejectedBlock
                );
                container.children?.push(
                    saveDocumentReject,
                    this.getReassignBlock(roleConfig.role),
                    sendRejectedBlock
                );
            }
        } else {
            const documentsSourceAddon = this.getDocumentsSourceAddon(
                roleConfig.role,
                schemaConfig.iri
            );
            createDependencySchemaAddonTag = documentsSourceAddon.tag;
            gridBlock?.children?.push(documentsSourceAddon);
        }

        if (roleConfig.isCreator) {
            let requestDocumentBlock = this.getDialogRequestDocumentBlock(
                roleConfig.role,
                schemaConfig.iri,
                false,
                schemaConfig.name
            );
            container.children?.push(requestDocumentBlock);
            if (relationshipSchema) {
                container.children?.push(
                    this.getSetRelationshipsBlock(
                        roleConfig.role,
                        relationshipSchema.iri,
                        relationshipSchema.isApproveEnable
                    )
                );
            }
            const sendCreatedBlock = this.getDocumentSendBlock(
                roleConfig.role,
                !schemaConfig.isMintSchema,
                schemaConfig.isApproveEnable
            );
            container.children?.push(sendCreatedBlock);
            schemaRefreshEvents[schemaConfig.iri].sendBlocks.push(
                sendCreatedBlock
            );
            if (!schemaConfig.isApproveEnable && schemaConfig.isMintSchema) {
                const mintBlock = this.getMintBlock(
                    roleConfig.role,
                    schemaConfig.mintOptions.tokenId,
                    schemaConfig.mintOptions.rule
                );
                schemaRefreshEvents[schemaConfig.iri].mintBlocks.push(
                    mintBlock
                );
                container.children?.push(mintBlock);
            }
            if (dependencySchema && createDependencySchemaAddonTag) {
                schemaRefreshEvents[dependencySchema.iri] ||= {
                    sendBlocks: [],
                    gridBlockTags: [],
                    mintBlocks: [],
                    vpGridBlockTags: [],
                };
                requestDocumentBlock = this.getDialogRequestDocumentBlock(
                    roleConfig.role,
                    dependencySchema.iri,
                    true,
                    dependencySchema.name
                );
                const sendCreatedDependencyBlock = this.getDocumentSendBlock(
                    roleConfig.role,
                    !dependencySchema.isMintSchema,
                    dependencySchema.isApproveEnable
                );
                container.children?.push(
                    requestDocumentBlock,
                    sendCreatedDependencyBlock
                );
                schemaRefreshEvents[dependencySchema.iri].sendBlocks.push(
                    sendCreatedDependencyBlock
                );
                if (
                    !dependencySchema.isApproveEnable &&
                    dependencySchema.isMintSchema
                ) {
                    const mintBlock = this.getMintBlock(
                        roleConfig.role,
                        dependencySchema.mintOptions.tokenId,
                        dependencySchema.mintOptions.rule
                    );
                    schemaRefreshEvents[dependencySchema.iri].mintBlocks.push(
                        mintBlock
                    );
                    container.children?.push(mintBlock);
                }
                gridBlock.uiMetaData.fields.push(
                    this.getCreateDependencySchemaColumn(
                        `Create ${dependencySchema.name}`,
                        requestDocumentBlock.tag,
                        createDependencySchemaAddonTag
                    )
                );
            }
        }
        return container;
    }

    /**
     * Create VP grid
     * @param trustChainConfig Trust chain config
     * @param trustChainTag Trust chain tag
     * @param container Container
     * @returns container
     */
    private createVPGrid(
        trustChainConfig: IWizardTrustChainConfig,
        trustChainTag: string,
        container: any
    ) {
        const vpGrid = this.getVpGrid(
            trustChainConfig.role,
            trustChainTag,
            trustChainConfig.viewOnlyOwnDocuments
        );
        container.children.push(vpGrid);
        return [container, vpGrid];
    }

    /**
     * Create trust chain steps
     * @param trustChainConfig Trust chain config
     * @param schemaConfigs Schema configs
     * @param container Container
     * @returns Container
     */
    private putTrustChainStepsIntoContainer(
        trustChainConfig: IWizardTrustChainConfig,
        schemaConfigs: IWizardSchemaConfig[],
        container: any
    ): [tabContainer: any, trustChainBlockTag: string] {
        const findRelatedSchemas = (
            iri: string,
            result: IWizardSchemaConfig[] = [],
            srcIri: string = iri
        ) => {
            const currentSchema = schemaConfigs.find(
                (item) => item.iri === iri
            );
            if (!currentSchema) {
                return result;
            }

            const dependencySchema = schemaConfigs.find(
                (item) => item.dependencySchemaIri === iri
            );
            if (
                dependencySchema &&
                result.findIndex(
                    (schema) => schema.iri === dependencySchema.iri
                ) < 0 &&
                srcIri !== dependencySchema.iri
            ) {
                result.push(dependencySchema);
                return findRelatedSchemas(dependencySchema.iri, result, srcIri);
            }

            const relationShipSchema = schemaConfigs.find(
                (item) => item.iri === currentSchema?.relationshipsSchemaIri
            );
            if (
                relationShipSchema &&
                result.findIndex(
                    (schema) => schema.iri === relationShipSchema.iri
                ) < 0 &&
                srcIri !== relationShipSchema.iri
            ) {
                result.push(relationShipSchema);
                return findRelatedSchemas(
                    relationShipSchema.iri,
                    result,
                    srcIri
                );
            }

            return result;
        };

        const reportBlock = this.getReportBlock(trustChainConfig.role);
        const mintReportItem = this.getReportMintItem(trustChainConfig.role);
        reportBlock.children.push(mintReportItem);
        const mintSchema = schemaConfigs.find(
            (item) => item.iri === trustChainConfig.mintSchemaIri
        );
        let relationshipsVariableName = '';
        if (mintSchema?.isApproveEnable) {
            let firstReportItemApproved;
            let firstReportItemCreated;
            [firstReportItemApproved, relationshipsVariableName] =
                this.getReportFirstItem(
                    trustChainConfig.role,
                    `${mintSchema.name} approved`,
                    `${mintSchema.name} approved`
                );
            [firstReportItemCreated, relationshipsVariableName] =
                this.getReportItem(
                    trustChainConfig.role,
                    `${mintSchema.name} created`,
                    `${mintSchema.name} created`,
                    relationshipsVariableName
                );
            reportBlock.children.push(
                firstReportItemApproved,
                firstReportItemCreated
            );
        } else if (mintSchema) {
            let firstReportItemCreated;
            [firstReportItemCreated, relationshipsVariableName] =
                this.getReportFirstItem(
                    trustChainConfig.role,
                    `${mintSchema?.name} created`,
                    `${mintSchema?.name} created`
                );
            reportBlock.children.push(firstReportItemCreated);
        }

        const relatedSchemas = findRelatedSchemas(mintSchema?.iri || '');
        for (const relatedSchema of relatedSchemas) {
            if (relatedSchema?.isApproveEnable) {
                let reportItemApproved;
                let reportItemCreated;
                [reportItemApproved, relationshipsVariableName] =
                    this.getReportItem(
                        trustChainConfig.role,
                        `${relatedSchema.name} approved`,
                        `${relatedSchema.name} approved`,
                        relationshipsVariableName
                    );
                [reportItemCreated, relationshipsVariableName] =
                    this.getReportItem(
                        trustChainConfig.role,
                        `${relatedSchema.name} created`,
                        `${relatedSchema.name} created`,
                        relationshipsVariableName
                    );
                reportBlock.children.push(
                    reportItemApproved,
                    reportItemCreated
                );
            } else {
                let reportItemCreated;
                [reportItemCreated, relationshipsVariableName] =
                    this.getReportFirstItem(
                        trustChainConfig.role,
                        `${relatedSchema?.name} created`,
                        `${relatedSchema?.name} created`
                    );
                reportBlock.children.push(reportItemCreated);
            }
        }

        container.children.push(reportBlock);
        return [container, reportBlock.tag];
    }

    /**
     * Get choose role block
     * @param roles Roles
     * @returns Block
     */
    private getChooseRoleBlock(roles: string[]) {
        return {
            id: GenerateUUIDv4(),
            tag: 'choose_role',
            roles: roles?.filter((role) => role !== 'OWNER'),
            blockType: BlockType.PolicyRoles,
            defaultActive: true,
            children: [],
            permissions: ['NO_ROLE'],
            events: [],
            artifacts: [],
            uiMetaData: {
                title: 'Choose role',
                description: 'Please select your role',
            },
        };
    }

    /**
     * Get Role Container block
     * @param role Role
     * @returns Block
     */
    getRoleContainer(role: string) {
        return {
            id: GenerateUUIDv4(),
            tag: this.generateBlockTag(role, BlockType.Container),
            blockType: BlockType.Container,
            defaultActive: true,
            children: [],
            permissions: [role],
            events: [],
            artifacts: [],
            uiMetaData: {
                type: 'tabs',
            },
        };
    }

    /**
     * Get role step block
     * @param role Role
     * @returns Block
     */
    getRoleStep(role: string) {
        const blockType = BlockType.Step;
        return {
            id: GenerateUUIDv4(),
            tag: this.generateBlockTag(role, blockType),
            blockType,
            defaultActive: true,
            children: [] as any,
            permissions: [role],
            events: [],
            artifacts: [],
        };
    }

    /**
     * Get tab container
     * @param role Role
     * @param title Title
     * @returns Block
     */
    getTabContainer(role: string, title: string) {
        const blockType = BlockType.Container;
        return {
            id: GenerateUUIDv4(),
            tag: this.generateBlockTag(role, blockType),
            blockType,
            defaultActive: true,
            children: [] as any,
            permissions: [role],
            events: [],
            artifacts: [],
            uiMetaData: {
                type: 'blank',
                title,
            },
        };
    }

    /**
     * Get documents grid block
     * @param role Role
     * @param fieldsConfig Fields config
     * @returns Block
     */
    getDocumentsGrid(role: string, fieldsConfig: IGridConfig[]) {
        const blockType = BlockType.DocumentsViewer;
        return {
            id: GenerateUUIDv4(),
            blockType,
            defaultActive: true,
            permissions: [role],
            onErrorAction: 'no-action',
            uiMetaData: {
                fields: [
                    ...fieldsConfig.map((fieldConfig) =>
                        Object({
                            name:
                                'document.credentialSubject.0.' +
                                fieldConfig.field,
                            title: fieldConfig.title,
                            type: 'text',
                        })
                    ),
                    {
                        name: 'document',
                        title: 'Document',
                        tooltip: '',
                        type: 'button',
                        action: 'dialog',
                        content: 'View Document',
                        uiClass: 'link',
                        hideWhenDiscontinued: false,
                        dialogContent: 'VC',
                        dialogClass: '',
                        dialogType: 'json',
                    },
                ],
            },
            tag: this.generateBlockTag(role, blockType),
            children: [this.getHistoryAddon(role)] as any,
        };
    }

    /**
     * Get history addon block
     * @param role Role
     */
    private getHistoryAddon(role: string) {
        const blockType = BlockType.HistoryAddon;
        return {
            id: GenerateUUIDv4(),
            blockType,
            defaultActive: false,
            permissions: [role],
            onErrorAction: 'no-action',
            tag: this.generateBlockTag(role, blockType),
        };
    }

    /**
     * Get approve/reject send block
     * @param role Role
     * @returns Block
     */
    private getChangeDocumentStatusSendBlock(role: string, status: string) {
        const blockType = BlockType.SendToGuardian;
        return {
            id: GenerateUUIDv4(),
            blockType,
            defaultActive: false,
            permissions: [role],
            onErrorAction: 'no-action',
            uiMetaData: {},
            options: [
                {
                    name: 'status',
                    value: status,
                },
            ],
            stopPropagation: false,
            dataSource: 'database',
            documentType: 'vc',
            tag: this.generateBlockTag(role, blockType),
        };
    }

    /**
     * Get document send block
     * @param role Role
     * @param stopPropagation Stop propagation
     * @param needApprove Is needed to approve
     * @param entityType Entity type
     * @returns Block
     */
    private getDocumentSendBlock(
        role: string,
        stopPropagation: boolean = false,
        needApprove: boolean = false,
        entityType?: string,
        blockTagsToTriggerRunEvent?: string[]
    ) {
        const blockType = BlockType.SendToGuardian;
        const tag = this.generateBlockTag(role, blockType);
        return {
            id: GenerateUUIDv4(),
            blockType,
            defaultActive: false,
            permissions: [role],
            onErrorAction: 'no-action',
            uiMetaData: {},
            options: needApprove
                ? [
                      {
                          name: 'status',
                          value: 'Waiting for approval',
                      },
                  ]
                : [],
            dataSource: 'auto',
            documentType: 'vc',
            tag,
            stopPropagation,
            entityType,
            events: Array.isArray(blockTagsToTriggerRunEvent)
                ? blockTagsToTriggerRunEvent.map((target) => ({
                      target,
                      source: tag,
                      input: 'RunEvent',
                      output: 'RunEvent',
                      actor: 'owner',
                      disabled: false,
                  }))
                : [],
        };
    }

    /**
     * Get reassign block
     * @param role Role
     * @param actorIsOwner Is actor owner
     * @returns Block
     */
    private getReassignBlock(role: string, actorIsOwner: boolean = false) {
        const blockType = BlockType.ReassigningBlock;
        return {
            id: GenerateUUIDv4(),
            blockType,
            defaultActive: false,
            permissions: [role],
            onErrorAction: 'no-action',
            uiMetaData: {},
            issuer: '',
            actor: actorIsOwner ? 'owner' : '',
            tag: this.generateBlockTag(role, blockType),
        };
    }

    /**
     * Get buttons block
     * @param role Role
     * @param approveDocumentBlockTag Approve document block tag
     * @param rejectDocumentBlockTag Reject document block tag
     * @returns Block
     */
    private getApproveRejectButtonsBlock(
        role: string,
        approveDocumentBlockTag: string,
        rejectDocumentBlockTag: string
    ) {
        const blockType = BlockType.ButtonBlock;
        const buttonBlockTag = this.generateBlockTag(role, blockType);
        return {
            id: GenerateUUIDv4(),
            blockType,
            defaultActive: false,
            permissions: [role],
            onErrorAction: 'no-action',
            uiMetaData: {
                buttons: [
                    {
                        tag: 'Button_0',
                        name: 'Approve',
                        type: 'selector',
                        filters: [],
                        field: 'option.status',
                        value: 'Approved',
                        uiClass: 'btn-approve',
                        hideWhenDiscontinued: false,
                    },
                    {
                        tag: 'Button_1',
                        name: 'Reject',
                        type: 'selector-dialog',
                        filters: [],
                        field: 'option.status',
                        value: 'Rejected',
                        uiClass: 'btn-reject',
                        title: 'Reject',
                        description: 'Enter reject reason',
                        hideWhenDiscontinued: false,
                    },
                ],
            },
            tag: buttonBlockTag,
            events: [
                {
                    target: approveDocumentBlockTag,
                    source: buttonBlockTag,
                    input: 'RunEvent',
                    output: 'Button_0',
                    actor: '',
                    disabled: false,
                },
                {
                    target: rejectDocumentBlockTag,
                    source: buttonBlockTag,
                    input: 'RunEvent',
                    output: 'Button_1',
                    actor: '',
                    disabled: false,
                },
            ],
        };
    }

    /**
     * Get approve reject field
     * @param bindBlock Bind block
     * @param bindGroup Bind group
     * @returns Field
     */
    private getApproveRejectField(bindBlock: string, bindGroup: string) {
        return {
            title: 'Operation',
            name: 'option.status',
            tooltip: '',
            type: 'block',
            action: '',
            url: '',
            dialogContent: '',
            dialogClass: '',
            dialogType: '',
            bindBlock,
            width: '250px',
            bindGroup,
        };
    }

    /**
     * Get documents source addon
     * @param role Role
     * @param schema Schema
     * @param onlyOwnDocuments Only own documents
     * @param filters Filters
     * @param dataType Data type
     * @returns Block
     */
    private getDocumentsSourceAddon(
        role: string,
        schema: string,
        onlyOwnDocuments: boolean = false,
        filters: any[] = [],
        dataType: string = 'vc-documents'
    ) {
        const blockType = BlockType.DocumentsSourceAddon;
        return {
            id: GenerateUUIDv4(),
            blockType,
            defaultActive: false,
            permissions: [role],
            onErrorAction: 'no-action',
            filters,
            dataType,
            schema,
            onlyOwnDocuments,
            tag: this.generateBlockTag(role, blockType),
        };
    }

    /**
     * Get dialog request
     * @param role Role
     * @param schemaIri Schema iri
     * @param dependencySchema Dependency schema
     * @param schemaName Schema name
     * @returns Block
     */
    getDialogRequestDocumentBlock(
        role: string,
        schemaIri: string,
        dependencySchema: boolean = false,
        schemaName?: string
    ) {
        const blockType = BlockType.Request;
        return {
            id: GenerateUUIDv4(),
            blockType,
            defaultActive: !dependencySchema,
            permissions: [role],
            onErrorAction: 'no-action',
            uiMetaData: {
                type: 'dialog',
                content: 'Create' + (schemaName ? ` ${schemaName}` : ''),
                dialogContent: 'Enter data',
                buttonClass: dependencySchema ? 'link' : '',
            },
            presetFields: [],
            idType: 'UUID',
            schema: schemaIri,
            tag: this.generateBlockTag(role, blockType),
        };
    }

    /**
     * Get request document block
     * @param role Role
     * @param schemaIri Schema iri
     * @returns Block
     */
    private getRequestDocumentBlock(role: string, schemaIri: string) {
        const blockType = BlockType.Request;
        return {
            id: GenerateUUIDv4(),
            blockType,
            defaultActive: true,
            permissions: [role],
            onErrorAction: 'no-action',
            uiMetaData: {
                type: 'page',
                title: 'Enter description',
            },
            schema: schemaIri,
            idType: 'UUID',
            tag: this.generateBlockTag(role, blockType),
        };
    }

    /**
     * Get info block
     * @param role Role
     * @param title Title
     * @param description Description
     * @returns Block
     */
    private getInfoBlock(role: string, title: string, description: string) {
        const blockType = BlockType.Information;
        return {
            id: GenerateUUIDv4(),
            blockType,
            defaultActive: true,
            permissions: [role],
            onErrorAction: 'no-action',
            uiMetaData: {
                description,
                type: 'text',
                title,
            },
            stopPropagation: true,
            tag: this.generateBlockTag(role, blockType),
        };
    }

    /**
     * Get report block
     * @param role Role
     * @returns Block
     */
    private getReportBlock(role: string) {
        const blockType = BlockType.Report;
        return {
            id: GenerateUUIDv4(),
            blockType: BlockType.Report,
            defaultActive: true,
            permissions: [role],
            onErrorAction: 'no-action',
            tag: this.generateBlockTag(role, blockType),
            children: [] as any,
        };
    }

    /**
     * Get report mint item
     * @param role Role
     * @returns Block
     */
    private getReportMintItem(role: string) {
        const blockType = BlockType.ReportItem;
        return {
            id: GenerateUUIDv4(),
            blockType,
            defaultActive: false,
            permissions: [role],
            onErrorAction: 'no-action',
            filters: [
                {
                    type: 'equal',
                    typeValue: 'variable',
                    field: 'document.id',
                    value: 'actionId',
                },
            ],
            variables: [],
            visible: true,
            iconType: 'COMMON',
            title: 'Token',
            description: 'Token[s] minted.',
            dynamicFilters: [],
            tag: this.generateBlockTag(role, blockType),
        };
    }

    /**
     * Get first report item block
     * @param role Role
     * @param title Title
     * @param description Description
     * @returns Block
     */
    private getReportFirstItem(
        role: string,
        title: string,
        description: string
    ): [config: any, relationshipsVariableName: string] {
        const blockType = BlockType.ReportItem;
        const generatedVariableName = GenerateUUIDv4();
        return [
            {
                id: GenerateUUIDv4(),
                blockType,
                defaultActive: false,
                permissions: [role],
                onErrorAction: 'no-action',
                filters: [
                    {
                        type: 'equal',
                        typeValue: 'variable',
                        field: 'document.id',
                        value: 'documentId',
                    },
                ],
                variables: [
                    {
                        name: generatedVariableName,
                        value: 'relationships',
                    },
                ],
                visible: true,
                iconType: 'COMMON',
                title,
                description,
                dynamicFilters: [],
                tag: this.generateBlockTag(role, blockType),
            },
            generatedVariableName,
        ];
    }

    /**
     * Get report item block
     * @param role Role
     * @param title Title
     * @param description Description
     * @param relationshipsVariableName Relationships variable name
     * @returns Block
     */
    private getReportItem(
        role: string,
        title: string,
        description: string,
        relationshipsVariableName: string
    ): [config: any, relationshipsVariableName: string] {
        const blockType = BlockType.ReportItem;
        const generatedVariableName = GenerateUUIDv4();
        return [
            {
                id: GenerateUUIDv4(),
                blockType,
                defaultActive: false,
                permissions: [role],
                onErrorAction: 'no-action',
                filters: [
                    {
                        type: 'in',
                        typeValue: 'variable',
                        field: 'messageId',
                        value: relationshipsVariableName,
                    },
                ],
                variables: [
                    {
                        value: 'relationships',
                        name: generatedVariableName,
                    },
                ],
                visible: true,
                iconType: 'COMMON',
                title,
                description,
                dynamicFilters: [],
                tag: this.generateBlockTag(role, blockType),
            },
            generatedVariableName,
        ];
    }

    /**
     * Get vp grid
     * @param role Role
     * @param trustChainTag Trust Chain tag
     * @param viewAll View all documents
     * @returns Block
     */
    private getVpGrid(
        role: string,
        trustChainTag: string,
        onlyOwnDocuments: boolean
    ) {
        const blockType = BlockType.DocumentsViewer;
        return {
            id: GenerateUUIDv4(),
            blockType,
            defaultActive: true,
            permissions: [role],
            onErrorAction: 'no-action',
            uiMetaData: {
                fields: [
                    {
                        title: 'HASH',
                        name: 'hash',
                        tooltip: '',
                        type: 'text',
                    },
                    {
                        title: 'Date',
                        name: 'document.verifiableCredential.1.credentialSubject.0.date',
                        tooltip: '',
                        type: 'text',
                    },
                    {
                        title: 'Token Id',
                        name: 'document.verifiableCredential.1.credentialSubject.0.tokenId',
                        tooltip: '',
                        type: 'text',
                    },
                    {
                        title: 'Serials',
                        name: 'document.verifiableCredential.1.credentialSubject.0.serials',
                        tooltip: '',
                        type: 'text',
                    },
                    {
                        title: 'TrustChain',
                        name: 'hash',
                        tooltip: '',
                        type: 'button',
                        action: 'link',
                        url: '',
                        dialogContent: '',
                        dialogClass: '',
                        dialogType: '',
                        bindBlock: trustChainTag,
                        content: 'View TrustChain',
                        width: '150px',
                    },
                ],
            },
            tag: this.generateBlockTag(role, blockType),
            children: [
                this.getDocumentsSourceAddon(
                    role,
                    '',
                    onlyOwnDocuments,
                    [],
                    'vp-documents'
                ),
            ],
        };
    }

    /**
     * Get mint block
     * @param role Role
     * @param tokenId Token Id
     * @param rule Rule
     * @returns Block
     */
    private getMintBlock(role: string, tokenId: string, rule: string) {
        const blockType = BlockType.Mint;
        return {
            id: GenerateUUIDv4(),
            blockType,
            stopPropagation: true,
            defaultActive: false,
            permissions: [role],
            onErrorAction: 'no-action',
            uiMetaData: {},
            tokenId,
            rule,
            accountType: 'default',
            tag: this.generateBlockTag(role, blockType),
        };
    }

    /**
     * Get create depndency schema column
     * @param title Title
     * @param bindBlock Bind block
     * @param bindGroup Bind group
     * @returns Column
     */
    getCreateDependencySchemaColumn(
        title: string,
        bindBlock: string,
        bindGroup: string
    ) {
        return {
            title,
            name: '',
            type: 'block',
            action: '',
            url: '',
            dialogContent: '',
            dialogClass: '',
            dialogType: '',
            bindBlock,
            width: '150px',
            bindGroup,
        };
    }

    /**
     * Get set relationships block
     * @param role Role
     * @param schemaIri Schema iri
     * @param isApproveEnable Is approve enabled
     * @returns Block
     */
    getSetRelationshipsBlock(
        role: string,
        schemaIri: string,
        isApproveEnable: boolean
    ) {
        const blockType = BlockType.SetRelationshipsBlock;
        return {
            id: GenerateUUIDv4(),
            blockType,
            defaultActive: false,
            permissions: [role],
            onErrorAction: 'no-action',
            includeAccounts: false,
            tag: this.generateBlockTag(role, blockType),
            children: [
                isApproveEnable
                    ? this.getDocumentsSourceAddon(role, schemaIri, true, [
                          {
                              value: 'approved_entity',
                              field: 'type',
                              type: 'equal',
                          },
                      ])
                    : this.getDocumentsSourceAddon(role, schemaIri, true),
            ],
        };
    }

    /**
     * Add refresh events
     * @param blocks Blocks
     * @param targetBlockTags Target block tags
     */
    addRefreshEvent(
        blocks: { tag: string; events?: any[] }[],
        targetBlockTags: string[]
    ) {
        for (const block of blocks) {
            block.events ||= [];
            block.events.push(
                ...targetBlockTags.map((target) => ({
                    target,
                    source: block.tag,
                    input: 'RefreshEvent',
                    output: 'RefreshEvent',
                    actor: '',
                    disabled: false,
                }))
            );
        }
    }
}
