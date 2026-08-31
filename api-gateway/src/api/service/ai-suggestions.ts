import { ClientProxy } from '@nestjs/microservices';
import { Body, Controller, Get, HttpCode, HttpStatus, Inject, Post, Put, Query } from '@nestjs/common';
import { ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiTags, ApiExtraModels, ApiQuery, ApiBody } from '@nestjs/swagger';
import { AISuggestions, InternalException } from '#helpers';
import { InternalServerErrorDTO, PropertySuggestionRequestDTO, PropertySuggestionResponseDTO } from '#middlewares';
import { PinoLogger } from '@guardian/common';
import { IPropertySuggestionResponse } from '@guardian/interfaces';

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
     * Suggest schema field properties
     */
    @Post('/schema-properties')
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
        @Body() body: PropertySuggestionRequestDTO,
    ): Promise<IPropertySuggestionResponse> {
        try {
            const aiSuggestions = new AISuggestions();
            return await aiSuggestions.getPropertySuggestions(body);
        } catch (error) {
            await InternalException(error, this.logger, null);
        }
    }
}
