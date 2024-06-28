import { ClientProxy } from '@nestjs/microservices';
import { Controller, Get, HttpCode, HttpStatus, Inject, Put, Query } from '@nestjs/common';
import { ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiTags, ApiExtraModels, ApiQuery } from '@nestjs/swagger';
import { AISuggestions, InternalException } from '#helpers';
import { InternalServerErrorDTO } from '#middlewares';

/**
 * AI suggestions route
 */
@Controller('ai-suggestions')
@ApiTags('ai-suggestions')
export class AISuggestionsAPI {
    constructor(@Inject('GUARDIANS') public readonly client: ClientProxy) {
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
        description: 'Successful operation.',
        schema: {
            example: 'ACM0001, ACM0002, ACM0006, ACM0007, ACM0018'
        },
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
            await InternalException(error);
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
        description: 'Successful operation.',
        type: Boolean
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async rebuildVector(): Promise<boolean> {
        try {
            const aiSuggestions = new AISuggestions();
            return await aiSuggestions.rebuildAIVector();
        } catch (error) {
            await InternalException(error);
        }
    }
}
