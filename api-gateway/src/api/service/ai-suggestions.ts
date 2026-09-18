import { ClientProxy } from '@nestjs/microservices';
import { Body, Controller, Get, HttpCode, HttpStatus, Inject, NotImplementedException, Post, Put, Query } from '@nestjs/common';
import { ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiTags, ApiExtraModels, ApiQuery, ApiBody } from '@nestjs/swagger';
import { Auth, AuthUser } from '#auth';
import { AISuggestions, InternalException } from '#helpers';
import { InternalServerErrorDTO, PropertySuggestionRequestDTO, PropertySuggestionResponseDTO } from '#middlewares';
import { IAuthUser, PinoLogger } from '@guardian/common';
import { IPropertySuggestionResponse, Permissions } from '@guardian/interfaces';
import process from 'node:process';

/**
 * Whether the Glossary AI feature (schema field property suggestions) is turned
 * on for this deployment. Off by default, same convention as the other
 * `process.env.X === 'true'` opt-in flags in this codebase.
 */
function isGlossaryAiEnabled(): boolean {
    return process.env.ENABLE_GLOSSARY_AI === 'true';
}

/**
 * AI suggestions route
 */
@Controller('ai-suggestions')
@ApiTags('ai-suggestions')
export class AISuggestionsAPI {
    constructor(@Inject('GUARDIANS') public readonly client: ClientProxy, private readonly logger: PinoLogger) {
    }

    /**
     * Ask
     */
    @Get('/ask')
    @ApiOperation({
        summary: 'Get methodology suggestion',
        description: 'Returns AI response to the current question',
    })
    @ApiOkResponse({
        description: 'Successful operation. Returns a comma-separated list of suggested methodology codes.',
        schema: {
            type: 'string'
        },
        examples: {
            withSuggestions: {
                summary: 'AI returned suggestions',
                value: 'ACM0001, ACM0002, ACM0006, ACM0007, ACM0018'
            }
        }
    })
    @ApiQuery({
        name: 'q',
        type: String,
        description: 'The question of choosing a methodology',
        required: true,
        example: 'Find me large scale projects'
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        examples: {
            default: {
                summary: 'Default example',
                value: { statusCode: 500, message: 'Error message' }
            }
        }
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getAIAnswer(
        @Query('q') q: string,
    ): Promise<string> {
        try {
            const aiSuggestions = new AISuggestions();
            return await aiSuggestions.getAIAnswer(q);
        } catch (error) {
            await InternalException(error, this.logger, null);
        }
    }

    /**
     * Rebuild AI vector
     */
    @Put('/rebuild-vector')
    @ApiOperation({
        summary: 'Rebuild AI vector',
        description: 'Rebuilds vector based on policy data in the DB',
    })
    @ApiOkResponse({
        description: 'Successful operation. Returns true when vector rebuild is complete.',
        schema: {
            type: 'boolean'
        },
        examples: {
            success: {
                summary: 'Vector rebuilt successfully',
                value: true
            }
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        examples: {
            default: {
                summary: 'Default example',
                value: { statusCode: 500, message: 'Error message' }
            }
        }
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async rebuildVector(): Promise<boolean> {
        try {
            const aiSuggestions = new AISuggestions();
            return await aiSuggestions.rebuildAIVector();
        } catch (error) {
            await InternalException(error, this.logger, null);
        }
    }

    /**
     * Whether Glossary AI is turned on
     */
    @Get('/schema-properties/enabled')
    @Auth(
        Permissions.SCHEMAS_SCHEMA_READ,
    )
    @ApiOperation({
        summary: 'Returns whether Glossary AI is enabled',
        description: 'Lets the client know upfront whether it should show the Glossary AI schema-tagging UI at all.',
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            type: 'boolean'
        },
        examples: {
            default: {
                summary: 'Glossary AI enabled',
                value: true
            }
        }
    })
    @HttpCode(HttpStatus.OK)
    getGlossaryAiEnabled(): boolean {
        return isGlossaryAiEnabled();
    }

    /**
     * Suggest schema field properties
     */
    @Post('/schema-properties')
    @Auth(
        Permissions.SCHEMAS_SCHEMA_CREATE,
    )
    @ApiOperation({
        summary: 'Suggest schema field properties',
        description: 'Returns ranked IWA property candidates for each schema field',
    })
    @ApiBody({
        description: 'Schema fields to tag.',
        required: true,
        type: PropertySuggestionRequestDTO
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: PropertySuggestionResponseDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        examples: {
            default: {
                summary: 'Default example',
                value: { statusCode: 500, message: 'Error message' }
            }
        }
    })
    @ApiExtraModels(PropertySuggestionRequestDTO, PropertySuggestionResponseDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getPropertySuggestions(
        @AuthUser() user: IAuthUser,
        @Body() body: PropertySuggestionRequestDTO,
    ): Promise<IPropertySuggestionResponse> {
        if (!isGlossaryAiEnabled()) {
            throw new NotImplementedException('Glossary AI is not enabled');
        }
        try {
            const aiSuggestions = new AISuggestions();
            return await aiSuggestions.getPropertySuggestions(body);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }
}
