import { Permissions } from '@guardian/interfaces';
import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthUser } from '../../auth/authorization-helper.js';
import { ApiBody, ApiCreatedResponse, ApiExtraModels, ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InternalServerErrorDTO } from '../../middlewares/validation/schemas/errors.js';
import { SuggestionsConfigDTO, SuggestionsConfigItemDTO, SuggestionsInputDTO, SuggestionsOutputDTO, } from '../../middlewares/validation/schemas/suggestions.js';
import { IAuthUser } from '@guardian/common';
import { Auth } from '../../auth/auth.decorator.js';
import { Guardians, ONLY_SR } from '../../helpers/index.js';


@Controller('suggestions')
@ApiTags('suggestions')
export class SuggestionsApi {
    /**
     * Get next and nested suggested block types
     */
    @Post('/')
    @Auth(
        Permissions.SUGGESTIONS_SUGGESTIONS_VIEW,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Get next and nested suggested block types',
        description: 'Get next and nested suggested block types.' + ONLY_SR,
    })
    @ApiBody({
        description: 'Data.',
        type: SuggestionsInputDTO,
    })
    @ApiOkResponse({
        description: 'Successful operation. Suggested next and nested block types respectively.',
        type: SuggestionsOutputDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(SuggestionsInputDTO, SuggestionsOutputDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async policySuggestions(
        @AuthUser() user: IAuthUser,
        @Body() body: SuggestionsInputDTO
    ): Promise<SuggestionsOutputDTO> {
        const guardians = new Guardians();
        return await guardians.policySuggestions(body, user);
    }

    /**
     * Set suggestions config
     */
    @Post('/config')
    @Auth(
        Permissions.SUGGESTIONS_SUGGESTIONS_UPDATE,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Set suggestions config',
        description: 'Set suggestions config.' + ONLY_SR,
    })
    @ApiBody({
        description: 'Suggestions config.',
        type: SuggestionsConfigDTO,
    })
    @ApiCreatedResponse({
        description: 'Successful operation. Response setted suggestions config.',
        type: SuggestionsConfigDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(SuggestionsConfigItemDTO, SuggestionsConfigDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.CREATED)
    async setPolicySuggestionsConfig(
        @AuthUser() user: IAuthUser,
        @Body() body: SuggestionsConfigDTO
    ): Promise<SuggestionsConfigDTO> {
        const guardians = new Guardians();
        return { items: await guardians.setPolicySuggestionsConfig(body.items, user) };
    }

    /**
     * Get suggestions config
     */
    @Get('/config')
    @Auth(
        Permissions.SUGGESTIONS_SUGGESTIONS_VIEW,
        // UserRole.STANDARD_REGISTRY,
    )
    @ApiOperation({
        summary: 'Get suggestions config',
        description: 'Get suggestions config.' + ONLY_SR,
    })
    @ApiOkResponse({
        description: 'Successful operation. Response suggestions config.',
        type: SuggestionsConfigDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @ApiExtraModels(SuggestionsConfigItemDTO, SuggestionsConfigDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getPolicySuggestionsConfig(
        @AuthUser() user: IAuthUser
    ): Promise<SuggestionsConfigDTO> {
        const guardians = new Guardians();
        return { items: await guardians.getPolicySuggestionsConfig(user) };
    }
}
