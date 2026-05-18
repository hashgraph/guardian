import { Guardians, TaskManager, ServiceError, ONLY_SR, InternalException, EntityOwner } from '#helpers';
import { IAuthUser, PinoLogger, RunFunctionAsync } from '@guardian/common';
import { Body, Controller, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { Permissions, TaskAction } from '@guardian/interfaces';
import { ApiAcceptedResponse, ApiBody, ApiCreatedResponse, ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiTags, ApiParam } from '@nestjs/swagger';
import { Examples, InternalServerErrorDTO, ObjectExamples, TaskDTO, WizardConfigAsyncDTO, WizardConfigDTO, WizardPreviewDTO, WizardResultDTO } from '#middlewares';
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
        description: 'Wizard configuration containing policy metadata, roles, schemas, and trust chain settings.',
        type: WizardConfigDTO,
        required: true,
        examples: {
            wizardConfig: {
                value: ObjectExamples.WIZARD_CONFIG
            }
        }
    })
    @ApiCreatedResponse({
        description: 'Successful operation. Returns the created policy ID and the wizard configuration used.',
        type: WizardResultDTO,
        examples: {
            default: {
                summary: 'Default example',
                value: ObjectExamples.WIZARD_RESULT
            }
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        examples: {
            default: {
                summary: 'Internal server error',
                value: { statusCode: 500, message: 'Something went wrong' }
            }
        }
    })
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
        description: 'Wizard configuration with saveState flag. When saveState is true, the wizard state is persisted for future editing.',
        type: WizardConfigAsyncDTO,
        required: true,
        examples: {
            wizardConfigAsync: {
                value: { saveState: true, wizardConfig: ObjectExamples.WIZARD_CONFIG }
            }
        }
    })
    @ApiAcceptedResponse({
        description: 'Task accepted. Use the returned taskId to poll for the result.',
        type: TaskDTO,
        examples: {
            default: {
                summary: 'Default example',
                value: { taskId: Examples.UUID, expectation: 0 }
            }
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        examples: {
            default: {
                summary: 'Internal server error',
                value: { statusCode: 500, message: 'Something went wrong' }
            }
        }
    })
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
        description: 'Database ID of the policy to get the wizard configuration for',
        required: true,
        example: Examples.DB_ID
    })
    @ApiBody({
        description: 'Wizard configuration to apply to the existing policy.',
        type: WizardConfigDTO,
        required: true,
        examples: {
            wizardConfig: {
                value: ObjectExamples.WIZARD_CONFIG
            }
        }
    })
    @ApiOkResponse({
        description: 'Successful operation. Returns the policy config preview and the wizard configuration.',
        type: WizardPreviewDTO,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        examples: {
            default: {
                summary: 'Internal server error',
                value: { statusCode: 500, message: 'Something went wrong' }
            }
        }
    })
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
