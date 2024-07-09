import { Guardians, TaskManager, ServiceError, ONLY_SR, InternalException, EntityOwner } from '#helpers';
import { IAuthUser, PinoLogger, RunFunctionAsync } from '@guardian/common';
import { Body, Controller, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { Permissions, TaskAction } from '@guardian/interfaces';
import { ApiBody, ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiTags, ApiParam, ApiExtraModels } from '@nestjs/swagger';
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
    @ApiOkResponse({
        description: 'Successful operation.',
        type: WizardResultDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
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
            await InternalException(error);
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
    @ApiOkResponse({
        description: 'Successful operation.',
        type: TaskDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
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
                await this.logger.error(error, ['API_GATEWAY']);
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
        type: WizardPreviewDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
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
            await InternalException(error);
        }
    }
}
