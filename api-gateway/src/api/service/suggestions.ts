import { UserRole } from '@guardian/interfaces';
import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, UseGuards, } from '@nestjs/common';
import { Guardians } from '../../helpers/guardians.js';
import { ApiBearerAuth, ApiCreatedResponse, ApiExtraModels, ApiForbiddenResponse, ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiSecurity, ApiTags, ApiUnauthorizedResponse, getSchemaPath, } from '@nestjs/swagger';
import { InternalServerErrorDTO } from '../../middlewares/validation/schemas/errors.js';
import { SuggestionsConfigDTO, SuggestionsConfigItemDTO, SuggestionsInputDTO, SuggestionsOutputDTO, } from '../../middlewares/validation/schemas/suggestions.js';
import { AuthGuard } from '../../auth/auth-guard.js';
import { Auth } from '../../auth/auth.decorator.js';

@Controller('suggestions')
@ApiTags('suggestions')
export class SuggestionsApi {
    @ApiOperation({
        summary: 'Get next and nested suggested block types',
        description:
            'Get next and nested suggested block types. Only users with the Standard Registry role are allowed to make the request.',
    })
    @ApiSecurity('bearerAuth')
    @ApiExtraModels(
        SuggestionsInputDTO,
        SuggestionsOutputDTO,
        InternalServerErrorDTO
    )
    @ApiOkResponse({
        description:
            'Successful operation. Suggested next and nested block types respectively.',
        schema: {
            $ref: getSchemaPath(SuggestionsOutputDTO),
        },
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        schema: {
            $ref: getSchemaPath(InternalServerErrorDTO),
        },
    })
    @ApiBearerAuth()
    @UseGuards(AuthGuard)
    @Post('/')
    @HttpCode(HttpStatus.OK)
    @Auth(UserRole.STANDARD_REGISTRY)
    async policySuggestions(
        @Req() req,
        @Body() body: SuggestionsInputDTO
    ): Promise<SuggestionsOutputDTO> {
        const user = req.user;
        const guardians = new Guardians();
        return await guardians.policySuggestions(body, user);
    }

    @ApiOperation({
        summary: 'Set suggestions config',
        description:
            'Set suggestions config. Only users with the Standard Registry role are allowed to make the request.',
    })
    @ApiSecurity('bearerAuth')
    @ApiExtraModels(
        SuggestionsConfigItemDTO,
        SuggestionsConfigDTO,
        InternalServerErrorDTO
    )
    @ApiCreatedResponse({
        description:
            'Successful operation. Response setted suggestions config.',
        schema: {
            $ref: getSchemaPath(SuggestionsConfigDTO),
        },
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        schema: {
            $ref: getSchemaPath(InternalServerErrorDTO),
        },
    })
    @ApiBearerAuth()
    @UseGuards(AuthGuard)
    @Post('/config')
    @HttpCode(HttpStatus.CREATED)
    @Auth(UserRole.STANDARD_REGISTRY)
    async setPolicySuggestionsConfig(
        @Req() req,
        @Body() body: SuggestionsConfigDTO
    ): Promise<SuggestionsConfigDTO> {
        const guardians = new Guardians();
        const user = req.user;
        return {
            items: await guardians.setPolicySuggestionsConfig(body.items, user),
        };
    }

    @ApiOperation({
        summary: 'Get suggestions config',
        description:
            'Get suggestions config. Only users with the Standard Registry role are allowed to make the request.',
    })
    @ApiSecurity('bearerAuth')
    @ApiExtraModels(
        SuggestionsConfigItemDTO,
        SuggestionsConfigDTO,
        InternalServerErrorDTO
    )
    @ApiOkResponse({
        description: 'Successful operation. Response suggestions config.',
        schema: {
            $ref: getSchemaPath(SuggestionsConfigDTO),
        },
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        schema: {
            $ref: getSchemaPath(InternalServerErrorDTO),
        },
    })
    @ApiBearerAuth()
    @UseGuards(AuthGuard)
    @Get('/config')
    @HttpCode(HttpStatus.OK)
    @Auth(UserRole.STANDARD_REGISTRY)
    async getPolicySuggestionsConfig(
        @Req() req
    ): Promise<SuggestionsConfigDTO> {
        const user = req.user;
        const guardians = new Guardians();
        return { items: await guardians.getPolicySuggestionsConfig(user) };
    }
}
