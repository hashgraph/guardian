import { IAuthUser, PinoLogger } from '@guardian/common';
import { Permissions } from '@guardian/interfaces';
import {
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Query,
    Response,
} from '@nestjs/common';
import {
    ApiBadRequestResponse,
    ApiExtraModels,
    ApiForbiddenResponse,
    ApiInternalServerErrorResponse,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiOperation,
    ApiQuery,
    ApiTags,
    ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
    BadRequestErrorDTO,
    ForbiddenErrorDTO,
    InternalServerErrorDTO,
    NotFoundErrorDTO,
    PolicyDataQueryResponseDTO,
    UnauthorizedErrorDTO,
} from '#middlewares';
import {
    POLICY_DATA_MAX_PAGE_SIZE,
    POLICY_DATA_DEFAULT_PAGE_SIZE,
} from '@guardian/interfaces';
import { AuthUser, Auth } from '#auth';
import { Guardians, InternalException } from '#helpers';

/**
 * Validates and parses the `filters` query-string value.
 * Returns the parsed object, or throws with a 400.
 * Field/operator/value whitelisting is left to the service layer (buildMongoFilter),
 * which is the sole source of truth for what's actually valid.
 */
function parseFilters(
    raw: string | undefined,
): Record<string, { op: string; value: unknown }> | undefined {
    if (!raw) {
        return undefined;
    }
    let parsed: unknown;
    try {
        parsed = JSON.parse(raw);
    } catch {
        throw new Error('`filters` must be a valid JSON object.');
    }
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        throw new Error('`filters` must be a JSON object, not an array or primitive.');
    }

    for (const [field, entry] of Object.entries(parsed as Record<string, unknown>)) {
        if (
            typeof entry !== 'object' ||
            entry === null ||
            !('op' in entry) ||
            !('value' in entry)
        ) {
            throw new Error(
                `Filter for field "${field}" must be an object with shape { "op": "<operator>", "value": <any> }.`
            );
        }
    }

    return parsed as Record<string, { op: string; value: unknown }>;
}

/**
 * PolicyDataApi — read-only dynamic query for data committed by Guardian policies.
 */
@Controller('policy-data')
@ApiTags('policy-data')
export class PolicyDataApi {

    constructor(private readonly logger: PinoLogger) { }

    /**
     * Returns a paginated list of VC documents committed by the given policy,
     */
    @Get('/query')
    @Auth(
        Permissions.POLICIES_POLICY_AUDIT,
        Permissions.POLICIES_POLICY_MANAGE,
    )
    @ApiOperation({
        summary: 'Query policy-committed VC documents.',
        description:
            'Returns a paginated list of Verifiable Credential documents committed by a published Guardian policy. ' +
            'Intentionally restricted to audit/manage roles for cross-policy access; there is no per-participant filtering.',
    })
    @ApiQuery({
        name: 'policyId',
        description: 'MongoDB ObjectId of the published policy.',
        required: true,
        type: String,
        example: '645f1e2d3a4b5c6d7e8f9012',
    })
    @ApiQuery({
        name: 'schemaName',
        description: 'Schema name as returned by GET /schema (e.g. "MRV Data").',
        required: true,
        type: String,
        example: 'MRV Data',
    })
    @ApiQuery({
        name: 'filters',
        description:
            'JSON-encoded filter map. Each key is a whitelisted system field or an `option.*` field. ' +
            'Each value is `{ "op": "<operator>", "value": <any> }`. ' +
            'Supported operators: `eq`, `ne`, `in`, `nin`, `gt`, `gte`, `lt`, `lte`, `contains` (case-insensitive partial string match). ' +
            'For `in`/`nin`, value must be an array. For `contains`, value must be a string. ' +
            'System field whitelist: owner, assignedTo, assignedToGroup, group, ' +
            'hederaStatus, signature, type, draft, edited, disconnected, ' +
            'policyId, schema, tag, messageId, topicId, hash, createDate, updateDate, option.*. ' +
            'Example: `{"hederaStatus":{"op":"eq","value":"ISSUE"}}`',
        required: false,
        type: String,
        example: '{"hederaStatus":{"op":"eq","value":"ISSUE"},"option.status":{"op":"ne","value":"REJECTED"}}',
    })
    @ApiQuery({
        name: 'page',
        description: '1-based page number (default: 1).',
        required: false,
        type: Number,
        example: 1,
    })
    @ApiQuery({
        name: 'pageSize',
        description: `Items per page (default: ${POLICY_DATA_DEFAULT_PAGE_SIZE}, max: ${POLICY_DATA_MAX_PAGE_SIZE}).`,
        required: false,
        type: Number,
        example: 20,
    })
    @ApiQuery({
        name: 'sort',
        description:
            'Field to sort by. Prefix with `-` for descending order (default: `-createDate`). ' +
            'Example: `createDate`, `-updateDate`, `owner`.',
        required: false,
        type: String,
        example: '-createDate',
    })
    @ApiOkResponse({
        description: 'Query executed successfully.',
        type: PolicyDataQueryResponseDTO,
        example: {
            data: [
                {
                    id: '645f1e2d3a4b5c6d7e8f9012',
                    policyId: '645f1e2d3a4b5c6d7e8f1234',
                    schema: '#MRVData',
                    owner: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8200599',
                    hederaStatus: 'ISSUE',
                    tag: 'mrv_data_block',
                    createDate: '2026-01-15T10:30:00.000Z',
                    updateDate: '2026-01-15T10:30:00.000Z',
                    option: { status: 'APPROVED' },
                    document: { id: 'urn:uuid:example', type: ['VerifiableCredential'] },
                },
            ],
            pagination: { page: 1, pageSize: 20, total: 42, totalPages: 3 },
            query: {
                policyId: '645f1e2d3a4b5c6d7e8f1234',
                schemaName: 'MRV Data',
                appliedFilters: { hederaStatus: { op: 'eq', value: 'ISSUE' } },
            },
        },
    })
    @ApiBadRequestResponse({
        description: 'Invalid query parameters (unknown filter field, invalid operator, bad JSON).',
        type: BadRequestErrorDTO,
        example: {
            statusCode: 400,
            message: 'Unknown filter field: "fooBar". Consult the system field whitelist in the API docs.',
        },
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized request.',
        type: UnauthorizedErrorDTO,
        example: { statusCode: 401, message: 'Unauthorized request' },
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
        type: ForbiddenErrorDTO,
        example: { message: 'Forbidden resource', error: 'Forbidden', statusCode: 403 },
    })
    @ApiNotFoundResponse({
        description: 'Policy or schema not found.',
        type: NotFoundErrorDTO,
        example: { statusCode: 404, message: 'Policy "abc" not found.' },
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        example: { statusCode: 500, message: 'Error message' },
    })
    @ApiExtraModels(PolicyDataQueryResponseDTO, BadRequestErrorDTO, NotFoundErrorDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async queryPolicyData(
        @AuthUser() user: IAuthUser,
        @Query('policyId') policyId: string,
        @Query('schemaName') schemaName: string,
        @Query('filters') rawFilters: string,
        @Query('page') rawPage: string,
        @Query('pageSize') rawPageSize: string,
        @Query('sort') sort: string,
        @Response() res: any,
    ): Promise<PolicyDataQueryResponseDTO> {
        try {
            if (!policyId || typeof policyId !== 'string' || !policyId.trim()) {
                return res.status(HttpStatus.BAD_REQUEST).send({
                    statusCode: 400,
                    message: '`policyId` query parameter is required.',
                });
            }
            if (!schemaName || typeof schemaName !== 'string' || !schemaName.trim()) {
                return res.status(HttpStatus.BAD_REQUEST).send({
                    statusCode: 400,
                    message: '`schemaName` query parameter is required.',
                });
            }

            let filters: Record<string, { op: string; value: unknown }> | undefined;
            try {
                filters = parseFilters(rawFilters);
            } catch (e: any) {
                return res.status(HttpStatus.BAD_REQUEST).send({
                    statusCode: 400,
                    message: e.message,
                });
            }

            const page = Math.max(1, parseInt(rawPage, 10) || 1);
            const pageSize = Math.min(POLICY_DATA_MAX_PAGE_SIZE, Math.max(1, parseInt(rawPageSize, 10) || POLICY_DATA_DEFAULT_PAGE_SIZE));

            const guardians = new Guardians();
            let result: { items: unknown[]; total: number };
            try {
                result = await guardians.getPolicyDataDocuments(
                    policyId.trim(),
                    schemaName.trim(),
                    filters,
                    page,
                    pageSize,
                    sort || undefined,
                    user.did,
                );
            } catch (svcError: any) {
                // MessageError.code survives the NATS round-trip (see Guardians.sendMessage); trust it when present.
                // Errors with no .code never reached guardian-service's handler (transport failure) — rethrow to log via InternalException below.
                if (svcError?.code) {
                    return res.status(svcError.code).send({ statusCode: svcError.code, message: svcError.message ?? String(svcError) });
                }
                throw svcError;
            }

            const { items, total } = result;
            const totalPages = Math.max(1, Math.ceil(total / pageSize));

            const body: PolicyDataQueryResponseDTO = {
                data: items as object[],
                pagination: { page, pageSize, total, totalPages },
                query: {
                    policyId: policyId.trim(),
                    schemaName: schemaName.trim(),
                    appliedFilters: filters ?? {},
                },
            };

            return res.status(HttpStatus.OK).send(body);
        } catch (error) {
            await InternalException(error, this.logger, user?.id);
        }
    }
}
