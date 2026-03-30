import { Auth, AuthUser } from '#auth';
import { InternalException, Guardians, Users } from '#helpers';
import { IAuthUser, PinoLogger } from '@guardian/common';
import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query, Response } from '@nestjs/common';
import { ApiBody, ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiParam, ApiQuery, ApiTags, ApiUnprocessableEntityResponse } from '@nestjs/swagger';
import {
    Examples,
    InternalServerErrorDTO,
    NewRelayerAccountDTO,
    ObjectExamples,
    pageHeader,
    RelayerAccountDTO,
    UnprocessableEntityErrorDTO,
    VcDocumentDTO,
} from '#middlewares';

@Controller('relayer-accounts')
@ApiTags('relayer-accounts')
export class RelayerAccountsApi {
    constructor(private readonly logger: PinoLogger) {
    }

    /**
     * Get Relayer Accounts
     */
    @Get('/')
    @Auth()
    @ApiOperation({
        summary: 'Returns the list of Relayer Accounts of the active user.',
        description: 'Returns the list of Relayer Accounts owned by the currently authenticated user. Supports pagination and text search by account name or Hedera account ID.'
    })
    @ApiQuery({
        name: 'pageIndex',
        type: Number,
        description: 'The number of pages to skip before starting to collect the result set',
        required: false,
        example: 0
    })
    @ApiQuery({
        name: 'pageSize',
        type: Number,
        description: 'The numbers of items to return',
        required: false,
        example: 20
    })
    @ApiQuery({
        name: 'search',
        type: String,
        description: 'Filter by account name or Hedera account ID (case-insensitive, partial match). Leave empty to return all.',
        required: false,
        example: ''
    })
    @ApiOkResponse({
        description: 'Successful operation. Returns relayer accounts array and total count in X-Total-Count header.',
        isArray: true,
        headers: pageHeader,
        type: RelayerAccountDTO,
        examples: {
            withAccounts: {
                summary: 'Relayer accounts found',
                value: [ObjectExamples.RELAYER_ACCOUNT]
            },
            empty: {
                summary: 'No relayer accounts',
                value: []
            }
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        examples: {
            userNotFound: {
                summary: 'User DID not found in the system',
                value: { statusCode: 500, message: 'User does not exist.' }
            },
            generic: {
                summary: 'Unexpected error',
                value: { statusCode: 500, message: 'Error message' }
            }
        }
    })
    @HttpCode(HttpStatus.OK)
    async getRelayerAccounts(
        @AuthUser() user: IAuthUser,
        @Response() res: any,
        @Query('pageIndex') pageIndex?: number,
        @Query('pageSize') pageSize?: number,
        @Query('search') search?: string,
    ): Promise<RelayerAccountDTO[]> {
        try {
            const users = new Users();
            const filters = {
                search,
                pageIndex,
                pageSize
            }
            const { items, count } = await users.getRelayerAccounts(user, filters);
            return res.header('X-Total-Count', count).send(items);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Create Relayer Account
     */
    @Post('/')
    @Auth()
    @ApiOperation({
        summary: 'Adds a new Relayer Account for the active user.',
        description: 'Creates a new Relayer Account by associating an existing Hedera account (account ID + private key) with the current user. The key is stored securely in the wallet.',
    })
    @ApiBody({
        description: 'New Relayer Account configuration. Requires a valid Hedera account ID and its private key.',
        type: NewRelayerAccountDTO,
        examples: {
            createAccount: {
                summary: 'Create relayer account with Hedera credentials',
                value: {
                    name: 'My Relayer Account',
                    account: '0.0.6046500',
                    key: '302e020100300506032b657004220420...'
                }
            }
        }
    })
    @ApiOkResponse({
        description: 'Successful operation. Returns the created relayer account.',
        type: RelayerAccountDTO,
        examples: {
            default: {
                    summary: 'Default example',
                value: ObjectExamples.RELAYER_ACCOUNT
            }
        }
    })
    @ApiUnprocessableEntityResponse({
        description: 'Unprocessable entity.',
        type: UnprocessableEntityErrorDTO,
        examples: {
            invalidAccount: {
                summary: 'Hedera account/key validation failed (also returned for empty body)',
                value: { statusCode: 422, message: 'Invalid account.' }
            },
            alreadyExists: {
                summary: 'Relayer account with this Hedera ID already exists for this owner',
                value: { statusCode: 422, message: 'Relayer account already exist.' }
            },
            userNotFound: {
                summary: 'User DID not found in the system',
                value: { statusCode: 422, message: 'User does not exist.' }
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
    @HttpCode(HttpStatus.OK)
    async createRelayerAccount(
        @AuthUser() user: IAuthUser,
        @Body() body: RelayerAccountDTO
    ): Promise<RelayerAccountDTO> {
        try {
            const users = new Users();
            return await users.createRelayerAccount(user, body);
        } catch (error) {
            error.code = HttpStatus.UNPROCESSABLE_ENTITY;
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Get current Relayer Account
     */
    @Get('/current')
    @Auth()
    @ApiOperation({
        summary: 'Returns current (default) Relayer Account of the active user.',
        description: 'Returns the default Hedera account of the active user, which is used as the relayer when no specific relayer account is selected.'
    })
    @ApiOkResponse({
        description: 'Successful operation. Returns the default account info (name is always "Default").',
        schema: {
            type: 'object',
            properties: {
                name: { type: 'string', description: 'Account name (always "Default")', example: 'Default' },
                owner: { type: 'string', description: 'Owner DID', example: Examples.DID },
                account: { type: 'string', description: 'Hedera account ID', example: Examples.ACCOUNT_ID }
            }
        },
        examples: {
            default: {
                    summary: 'Default example',
                value: { name: 'Default', owner: Examples.DID, account: Examples.ACCOUNT_ID }
            }
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        examples: {
            userNotFound: {
                summary: 'User DID not found in the system',
                value: { statusCode: 500, message: 'User does not exist.' }
            },
            generic: {
                summary: 'Unexpected error',
                value: { statusCode: 500, message: 'Error message' }
            }
        }
    })
    @HttpCode(HttpStatus.OK)
    async getCurrentRelayerAccount(
        @AuthUser() user: IAuthUser,
    ): Promise<RelayerAccountDTO> {
        try {
            const users = new Users();
            return await users.getCurrentRelayerAccount(user);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Get all Relayer Accounts
     */
    @Get('/all')
    @Auth()
    @ApiOperation({
        summary: 'Returns the list of Relayer Accounts available for use in the Policy by the active user.',
        description: 'Returns all Relayer Accounts owned by the current user. Unlike GET /, this endpoint returns all accounts without pagination.'
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        isArray: true,
        type: RelayerAccountDTO,
        examples: {
            withAccounts: {
                summary: 'Relayer accounts found',
                value: [ObjectExamples.RELAYER_ACCOUNT]
            },
            empty: {
                summary: 'No relayer accounts',
                value: []
            }
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        examples: {
            userNotFound: {
                summary: 'User DID not found in the system',
                value: { statusCode: 500, message: 'User does not exist.' }
            },
            generic: {
                summary: 'Unexpected error',
                value: { statusCode: 500, message: 'Error message' }
            }
        }
    })
    @HttpCode(HttpStatus.OK)
    async getRelayerAccountsAll(
        @AuthUser() user: IAuthUser,
    ): Promise<RelayerAccountDTO[]> {
        try {
            const users = new Users();
            return await users.getRelayerAccountsAll(user);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Get Relayer Account balance
     */
    @Get('/:account/balance')
    @Auth()
    @ApiOperation({
        summary: 'Returns current HBAR balance of the specified Relayer Account.',
        description: 'Queries the Hedera network for the current HBAR balance of the specified account. The account must belong to the current user or be a relayer account owned by them.'
    })
    @ApiParam({
        name: 'account',
        type: String,
        description: 'Hedera account ID of the relayer account',
        required: true,
        example: Examples.ACCOUNT_ID
    })
    @ApiOkResponse({
        description: 'Successful operation. Returns the HBAR balance as a string (e.g. "999.34 tℏ").',
        schema: {
            type: 'string'
        },
        examples: {
            withBalance: {
                summary: 'Account has balance',
                value: '999.33977375 tℏ'
            },
            zeroBalance: {
                summary: 'Zero balance',
                value: '0 tℏ'
            }
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        examples: {
            accountNotFound: {
                summary: 'Relayer account not found or not owned by user',
                value: { statusCode: 500, message: 'Relayer account does not exist.' }
            },
            generic: {
                summary: 'Unexpected error (e.g. Hedera network issue)',
                value: { statusCode: 500, message: 'Error message' }
            }
        }
    })
    @HttpCode(HttpStatus.OK)
    async getRelayerAccountBalance(
        @AuthUser() user: IAuthUser,
        @Param('account') account: string,
    ): Promise<any> {
        try {
            const users = new Users();
            return await users.getRelayerAccountBalance(user, account);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Generate Relayer Account
     */
    @Post('/generate')
    @Auth()
    @ApiOperation({
        summary: 'Generate a new Relayer Account.',
        description: 'Generates a new Hedera account on the network and registers it as a Relayer Account for the current user. The account is created and funded automatically.',
    })
    @ApiOkResponse({
        description: 'Successful operation. Returns the generated Hedera account ID and private key. Store the key securely — it is only returned once.',
        schema: {
            type: 'object',
            properties: {
                id: { type: 'string', description: 'Generated Hedera account ID' },
                key: { type: 'string', description: 'Private key for the generated account (hex-encoded DER)' }
            }
        },
        examples: {
            generated: {
                summary: 'Generated account',
                value: {
                    id: '0.0.8384973',
                    key: '302e020100300506032b6570042204202f750d1cbc05a26d8e9abb556f7be9f03e552f2d76d621639633491548434352'
                }
            }
        }
    })
    @ApiUnprocessableEntityResponse({
        description: 'Unprocessable entity.',
        type: UnprocessableEntityErrorDTO,
        examples: {
            hederaAccountNotFound: {
                summary: 'User has no Hedera account or DID',
                value: { statusCode: 422, message: 'Hedera Account not found' }
            },
            generationFailed: {
                summary: 'Account generation failed on Hedera network',
                value: { statusCode: 422, message: 'Error message' }
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
    @HttpCode(HttpStatus.OK)
    async generateRelayerAccount(
        @AuthUser() user: IAuthUser,
    ): Promise<any> {
        try {
            const users = new Users();
            return await users.generateRelayerAccount(user);
        } catch (error) {
            error.code = HttpStatus.UNPROCESSABLE_ENTITY;
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Get Relayer Accounts for all users
     */
    @Get('/accounts')
    @Auth()
    @ApiOperation({
        summary: 'Return the list of Relayer Accounts for the user.',
        description: 'If the active user is a Standard Registry, returns the list of all users (and their relayer accounts) under this SR. Each user appears once per relayer account plus once for the default account (with null relayer fields).'
    })
    @ApiQuery({
        name: 'pageIndex',
        type: Number,
        description: 'The number of pages to skip before starting to collect the result set',
        required: false,
        example: 0
    })
    @ApiQuery({
        name: 'pageSize',
        type: Number,
        description: 'The numbers of items to return',
        required: false,
        example: 20
    })
    @ApiQuery({
        name: 'search',
        type: String,
        description: 'Filter by username, Hedera account ID, relayer account ID or name (case-insensitive, partial match)',
        required: false,
        example: ''
    })
    @ApiOkResponse({
        description: 'Successful operation. Returns users with their relayer accounts and total count in X-Total-Count header.',
        isArray: true,
        headers: pageHeader,
        examples: {
            withAccounts: {
                summary: 'User with default and relayer accounts',
                value: [
                    {
                        _id: Examples.DB_ID,
                        username: 'ExampleUser',
                        did: Examples.DID,
                        hederaAccountId: Examples.ACCOUNT_ID
                    },
                    {
                        _id: Examples.DB_ID,
                        username: 'ExampleUser',
                        did: Examples.DID,
                        hederaAccountId: Examples.ACCOUNT_ID,
                        relayerAccountId: '0.0.6046500',
                        relayerAccountName: 'New Test Account'
                    }
                ]
            },
            empty: {
                summary: 'No accounts',
                value: []
            }
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        examples: {
            userNotFound: {
                summary: 'User DID not found in the system',
                value: { statusCode: 500, message: 'User does not exist.' }
            },
            generic: {
                summary: 'Unexpected error',
                value: { statusCode: 500, message: 'Error message' }
            }
        }
    })
    @HttpCode(HttpStatus.OK)
    async getUserRelayerAccounts(
        @AuthUser() user: IAuthUser,
        @Response() res: any,
        @Query('pageIndex') pageIndex?: number,
        @Query('pageSize') pageSize?: number,
        @Query('search') search?: string,
    ): Promise<RelayerAccountDTO[]> {
        try {
            const users = new Users();
            const filters = {
                search,
                pageIndex,
                pageSize
            }
            const { items, count } = await users.getUserRelayerAccounts(user, filters);
            return res.header('X-Total-Count', count).send(items);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    /**
     * Get relationships
     */
    @Get('/:relayerAccountId/relationships')
    @Auth()
    @ApiOperation({
        summary: 'Return the list of VC documents associated with the selected Relayer Account.',
        description: 'Returns paginated VC documents that were created using the specified relayer account. Each document is enriched with policyName, policyVersion, and schemaName.'
    })
    @ApiParam({
        name: 'relayerAccountId',
        type: String,
        description: 'Hedera account ID of the Relayer Account (not the database ID)',
        required: true,
        example: '0.0.6046500'
    })
    @ApiQuery({
        name: 'pageIndex',
        type: Number,
        description: 'The number of pages to skip before starting to collect the result set',
        required: false,
        example: 0
    })
    @ApiQuery({
        name: 'pageSize',
        type: Number,
        description: 'The numbers of items to return',
        required: false,
        example: 20
    })
    @ApiOkResponse({
        description: 'Successful operation. Returns VC documents and total count in X-Total-Count header.',
        isArray: true,
        headers: pageHeader,
        type: VcDocumentDTO,
        examples: {
            withDocuments: {
                summary: 'VC documents found',
                value: [ObjectExamples.VC_DOCUMENT_1]
            },
            empty: {
                summary: 'No VC documents for this relayer account',
                value: []
            }
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        examples: {
            invalidParams: {
                summary: 'Invalid parameters',
                value: { statusCode: 500, message: 'Invalid parameters.' }
            },
            generic: {
                summary: 'Unexpected error',
                value: { statusCode: 500, message: 'Error message' }
            }
        }
    })
    @HttpCode(HttpStatus.OK)
    async getRelayerAccountRelationships(
        @AuthUser() user: IAuthUser,
        @Response() res: any,
        @Param('relayerAccountId') relayerAccountId: string,
        @Query('pageIndex') pageIndex?: number,
        @Query('pageSize') pageSize?: number,
    ): Promise<VcDocumentDTO[]> {
        try {
            const filters = {
                pageIndex,
                pageSize
            }
            const guardian = new Guardians();
            const { items, count } = await guardian.getRelayerAccountRelationships(relayerAccountId, user, filters);
            return res.header('X-Total-Count', count).send(items);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }
}
