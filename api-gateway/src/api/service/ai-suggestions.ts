import { Logger } from '@guardian/common';
import { ClientProxy } from '@nestjs/microservices';
import { Controller, Get, HttpCode, HttpStatus, Inject, Put, Req } from '@nestjs/common';
import { ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiTags, getSchemaPath } from '@nestjs/swagger';
import { AISuggestions } from '@helpers/ai-suggestions';
import { ApiImplicitParam } from '@nestjs/swagger/dist/decorators/api-implicit-param.decorator';
import { InternalServerErrorDTO } from '@middlewares/validation/schemas';

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
    @ApiImplicitParam({
        name: 'q',
        type: String,
        description: 'The question of choosing a methodology',
        required: true,
        example: 'Find me large scale projects'
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        schema: {
            $ref: getSchemaPath(InternalServerErrorDTO)
        }
    })
    @HttpCode(HttpStatus.OK)
    async getAIAnswer(@Req() req): Promise<string> {
        const question = req.query.q as string;
        const aiSuggestions = new AISuggestions();
        let aiResponse;
        try {
            aiResponse = await aiSuggestions.getAIAnswer(question);
        } catch (e) {
            aiResponse = null;
            new Logger().error(e, ['API_GATEWAY']);
            throw e;
        }

        return aiResponse;
    }

    @Put('/rebuild-vector')
    @ApiOperation({
        summary: 'Rebuild AI vector',
        description: 'Rebuilds vector based on policy data in the DB',
    })
    @HttpCode(HttpStatus.OK)
    async rebuildVector(@Req() req): Promise<boolean> {
        const aiSuggestions = new AISuggestions();
        let result = false;
        try {
            result = await aiSuggestions.rebuildAIVector();
        } catch (e) {
            new Logger().error(e, ['API_GATEWAY']);
            throw e;
        }

        return result;
    }
}
