import { Guardians, TaskManager, ServiceError, ONLY_SR, InternalException, EntityOwner } from '#helpers';
import { IAuthUser, PinoLogger, RunFunctionAsync } from '@guardian/common';
import { Body, Controller, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { Permissions, TaskAction } from '@guardian/interfaces';
import { ApiAcceptedResponse, ApiBody, ApiCreatedResponse, ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiTags, ApiParam, ApiExtraModels } from '@nestjs/swagger';
import { Examples, InternalServerErrorDTO, TaskDTO, WizardConfigAsyncDTO, WizardConfigDTO, WizardPreviewDTO, WizardResultDTO } from '#middlewares';
import { AuthUser, Auth } from '#auth';

@Controller('wizard')
@ApiTags('wizard')
export class WizardApi {
    constructor(private readonly logger: PinoLogger) {
    }

    /**
     * Creates a new policy
     */
    @Post('/policy')
    @Auth(
        Permissions.POLICIES_POLICY_CREATE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Creates a new policy.',
        description: 'Creates a new policy by wizard.' + ONLY_SR,
    })
    @ApiBody({
        description: 'Object that contains wizard configuration.',
        type: WizardConfigDTO,
        required: true
    })
    @ApiCreatedResponse({
        description: 'Successful operation.',
        type: WizardResultDTO,
        example: { policyId: 'f3b2a9c1e4d5678901234567', wizardConfig: { roles: ['string'], policy: {}, schemas: [{}], trustChain: [{}] } }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { code: 500, message: 'Error message' }
    })
    @ApiExtraModels(WizardConfigDTO, WizardResultDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.CREATED)
    async setPolicy(
        @AuthUser() user: IAuthUser,
        @Body() wizardConfig: WizardConfigDTO
    ): Promise<WizardResultDTO> {
        try {
            const owner = new EntityOwner(user);
            const guardians = new Guardians();
            return await guardians.wizardPolicyCreate(wizardConfig, owner);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Creates a new policy
     */
    @Post('/push/policy')
    @Auth(
        Permissions.POLICIES_POLICY_CREATE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Creates a new policy.',
        description: 'Creates a new policy by wizard.' + ONLY_SR,
    })
    @ApiBody({
        description: 'Object that contains wizard configuration.',
        type: WizardConfigAsyncDTO,
        required: true
    })
    @ApiAcceptedResponse({
        description: 'Successful operation.',
        type: TaskDTO,
        example: { taskId: 'f3b2a9c1e4d5678901234567', expectation: 0 }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { code: 500, message: 'Error message' }
    })
    @ApiExtraModels(WizardConfigAsyncDTO, TaskDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.ACCEPTED)
    async setPolicyAsync(
        @AuthUser() user: IAuthUser,
        @Body() body: WizardConfigAsyncDTO
    ): Promise<TaskDTO> {
        const { wizardConfig, saveState } = body;
        const owner = new EntityOwner(user);
        const taskManager = new TaskManager();
        const task = taskManager.start(TaskAction.WIZARD_CREATE_POLICY, user.id);
        RunFunctionAsync<ServiceError>(
            async () => {
                const guardians = new Guardians();
                await guardians.wizardPolicyCreateAsyncNew(
                    wizardConfig,
                    owner,
                    saveState,
                    task
                );
            },
            async (error) => {
                await this.logger.error(error, ['API_GATEWAY'], user.id);
                taskManager.addError(task.taskId, {
                    code: 500,
                    message: error.message,
                });
            }
        );
        return task;
    }

    /**
     * Get config
     */
    @Post('/:policyId/config')
    @Auth(
        Permissions.POLICIES_POLICY_CREATE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Get policy config.',
        description: 'Get policy config by wizard.' + ONLY_SR,
    })
    @ApiParam({
        name: 'policyId',
        type: String,
        description: 'Policy Id',
        required: true,
        example: Examples.DB_ID
    })
    @ApiBody({
        description: 'Object that contains wizard configuration.',
        type: WizardConfigDTO,
        required: true
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: WizardPreviewDTO,
        example: { policyConfig: { id: Examples.DB_ID,
            uuid: Examples.UUID,
            name: 'Policy name',
            description: 'Description',
            topicDescription: 'Description',
            policyTag: 'Tag',
            status: 'DRAFT',
            creator: Examples.DID,
            owner: Examples.DID,
            topicId: Examples.ACCOUNT_ID,
            messageId: Examples.MESSAGE_ID,
            codeVersion: '1.0.0',
            createDate: Examples.DATE,
            version: '1.0.0',
            originalChanged: true,
            config: {},
            userRole: 'Installer',
            userRoles: ['Installer'],
            userGroup: {
            uuid: Examples.UUID,
            role: 'Installer',
            groupLabel: 'Label',
            groupName: 'Name',
            active: true
        }, userGroups: [{
            uuid: Examples.UUID,
            role: 'Installer',
            groupLabel: 'Label',
            groupName: 'Name',
            active: true
        }], policyRoles: ['Registrant'], policyNavigation: [{
            role: 'Registrant',
            steps: [{
                block: 'Block tag',
                level: 1,
                name: 'Step name'
            }]
        }], policyTopics: [{
            name: 'Project',
            description: 'Project',
            memoObj: 'topic',
            static: false,
            type: 'any'
        }], policyTokens: [{
            tokenName: 'Token name',
            tokenSymbol: 'Token symbol',
            tokenType: 'non-fungible',
            decimals: '',
            changeSupply: true,
            enableAdmin: true,
            enableFreeze: true,
            enableKYC: true,
            enableWipe: true,
            templateTokenTag: 'token_template_0'
        }], policyGroups: [{
            name: 'Group name',
            creator: 'Registrant',
            groupAccessType: 'Private',
            groupRelationshipType: 'Multiple',
            members: ['Registrant']
        }],
        categories: ['string'],
        projectSchema: Examples.UUID,
        tests: [{ id: Examples.DB_ID,
        uuid: Examples.UUID,
        name: 'Test Name',
        policyId: Examples.DB_ID,
        owner: Examples.DID,
        status: 'NEW',
        date: Examples.DATE,
        duration: 0,
        progress: 0,
        resultId: Examples.UUID,
        result: {} }],
        ignoreRules: [{ code: 'string',
        blockType: 'string',
        property: 'string',
        contains: 'string',
        severity: 'warning' }] },
        wizardConfig: { roles: ['string'],
        policy: {},
        schemas: [{}],
        trustChain: [{}] } }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { code: 500, message: 'Error message' }
    })
    @ApiExtraModels(WizardConfigDTO, WizardPreviewDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async setPolicyConfig(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
        @Body() wizardConfig: WizardConfigDTO
    ): Promise<WizardPreviewDTO> {
        try {
            const guardians = new Guardians();
            const owner = new EntityOwner(user);
            return await guardians.wizardGetPolicyConfig(policyId, wizardConfig, owner);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }
}
