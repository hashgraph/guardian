import { IAuthUser, PinoLogger } from '@guardian/common';
import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Post,
    Put,
    Response,
} from '@nestjs/common';
import { Permissions } from '@guardian/interfaces';
import {
    ApiTags,
    ApiOperation,
    ApiOkResponse,
    ApiInternalServerErrorResponse,
    ApiParam,
    ApiBody,
} from '@nestjs/swagger';
import { Guardians, InternalException } from '#helpers';
import { Auth, AuthUser } from '#auth';
import { InternalServerErrorDTO } from '#middlewares';

// -------------------------------------------------------------------------
// DTOs
// -------------------------------------------------------------------------

class OracleConfigDTO {
    /** Whether this Guardian instance is acting as an Oracle */
    enabled: boolean;
    /** EVM address of the deployed GuardianOracle.sol contract */
    contractAddress: string;
    /** Hedera account id used to sign oracle transactions */
    operatorAccountId: string;
    /** Hedera network: mainnet | testnet | previewnet | local */
    networkName: string;
}

class OracleVerdictDTO {
    /** Hedera token id (e.g. "0.0.1234") */
    tokenId: string;
    /** EVM mirror address of the token */
    tokenAddress: string;
    /** true = trust chain is valid */
    isValid: boolean;
    /** Unix timestamp of last on-chain update */
    updatedAt: number;
    /** EVM address that last pushed the verdict */
    updatedBy: string;
    /** Hedera transaction id of the last update (if tracked) */
    txId?: string;
}

class UpdateVerdictBodyDTO {
    /** Override the validity verdict manually (admin use) */
    isValid: boolean;
}

// -------------------------------------------------------------------------
// Controller
// -------------------------------------------------------------------------

@Controller('oracle')
@ApiTags('oracle')
export class OracleApi {
    constructor(private readonly logger: PinoLogger) {}

    // ------------------------------------------------------------------
    // GET /oracle/config
    // ------------------------------------------------------------------

    @Get('/config')
    @Auth(Permissions.POLICIES_POLICY_MANAGE)
    @ApiOperation({
        summary: 'Returns current Guardian Oracle configuration.',
        description:
            'Returns the current Oracle configuration for this Guardian instance. ' +
            'Secret operator keys are NOT included in the response.',
    })
    @ApiOkResponse({
        description: 'Current oracle configuration.',
        type: OracleConfigDTO,
    })
    @ApiInternalServerErrorResponse({ type: InternalServerErrorDTO })
    @HttpCode(HttpStatus.OK)
    async getOracleConfig(
        @AuthUser() user: IAuthUser,
        @Response() res: any
    ): Promise<OracleConfigDTO> {
        try {
            const guardians = new Guardians();
            const config = await guardians.sendMessage(
                { type: 'ORACLE_GET_CONFIG' },
                user
            );
            return res.send(config);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    // ------------------------------------------------------------------
    // PUT /oracle/config
    // ------------------------------------------------------------------

    @Put('/config')
    @Auth(Permissions.POLICIES_POLICY_MANAGE)
    @ApiOperation({
        summary: 'Update Guardian Oracle configuration.',
        description:
            'Enables or disables the Oracle, and sets the contract address and operator keys. ' +
            'Requires Standard Registry or Admin permissions.',
    })
    @ApiBody({ type: OracleConfigDTO })
    @ApiOkResponse({
        description: 'Updated oracle configuration.',
        type: OracleConfigDTO,
    })
    @ApiInternalServerErrorResponse({ type: InternalServerErrorDTO })
    @HttpCode(HttpStatus.OK)
    async setOracleConfig(
        @AuthUser() user: IAuthUser,
        @Body() body: OracleConfigDTO,
        @Response() res: any
    ): Promise<OracleConfigDTO> {
        try {
            const guardians = new Guardians();
            const config = await guardians.sendMessage(
                { type: 'ORACLE_SET_CONFIG', config: body },
                user
            );
            return res.send(config);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    // ------------------------------------------------------------------
    // GET /oracle/tokens/:tokenId/verdict
    // ------------------------------------------------------------------

    @Get('/tokens/:tokenId/verdict')
    @Auth(Permissions.AUDIT_TRUST_CHAIN_READ)
    @ApiOperation({
        summary: 'Returns the on-chain oracle verdict for a token.',
        description:
            'Queries the GuardianOracle smart contract via Hedera Mirror Node ' +
            'and returns the current validity verdict for the specified token.',
    })
    @ApiParam({
        name: 'tokenId',
        type: String,
        description: 'Hedera token id (e.g. "0.0.1234")',
        example: '0.0.1234',
    })
    @ApiOkResponse({
        description: 'Current on-chain verdict for the token.',
        type: OracleVerdictDTO,
    })
    @ApiInternalServerErrorResponse({ type: InternalServerErrorDTO })
    @HttpCode(HttpStatus.OK)
    async getTokenVerdict(
        @AuthUser() user: IAuthUser,
        @Param('tokenId') tokenId: string,
        @Response() res: any
    ): Promise<OracleVerdictDTO> {
        try {
            const guardians = new Guardians();
            const verdict = await guardians.sendMessage(
                { type: 'ORACLE_GET_VERDICT', tokenId },
                user
            );
            return res.send(verdict);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    // ------------------------------------------------------------------
    // POST /oracle/tokens/:tokenId/verdict
    // ------------------------------------------------------------------

    @Post('/tokens/:tokenId/verdict')
    @Auth(Permissions.POLICIES_POLICY_MANAGE)
    @ApiOperation({
        summary: 'Manually push a verdict for a token to the Oracle contract.',
        description:
            'Admin endpoint to manually mark a token as valid or invalid on-chain. ' +
            'Under normal operation, verdicts are pushed automatically by the Guardian ' +
            'policy engine when trust chains are created or revoked.',
    })
    @ApiParam({
        name: 'tokenId',
        type: String,
        description: 'Hedera token id (e.g. "0.0.1234")',
        example: '0.0.1234',
    })
    @ApiBody({ type: UpdateVerdictBodyDTO })
    @ApiOkResponse({
        description: 'Verdict pushed. Returns Hedera transaction id.',
    })
    @ApiInternalServerErrorResponse({ type: InternalServerErrorDTO })
    @HttpCode(HttpStatus.OK)
    async pushVerdict(
        @AuthUser() user: IAuthUser,
        @Param('tokenId') tokenId: string,
        @Body() body: UpdateVerdictBodyDTO,
        @Response() res: any
    ): Promise<{ txId: string | null }> {
        try {
            const guardians = new Guardians();
            const result = await guardians.sendMessage(
                { type: 'ORACLE_PUSH_VERDICT', tokenId, isValid: body.isValid },
                user
            );
            return res.send(result);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }

    // ------------------------------------------------------------------
    // GET /oracle/contract
    // ------------------------------------------------------------------

    @Get('/contract')
    @Auth(Permissions.AUDIT_TRUST_CHAIN_READ)
    @ApiOperation({
        summary: 'Returns the deployed GuardianOracle contract address.',
        description:
            'Returns the EVM address of the GuardianOracle contract so that ' +
            'third-party smart contracts can be pointed at the correct oracle.',
    })
    @ApiOkResponse({
        description: 'Oracle contract address.',
        schema: {
            type: 'object',
            properties: {
                contractAddress: {
                    type: 'string',
                    example: '0x000000000000000000000000000000000004D2',
                },
                networkName: { type: 'string', example: 'testnet' },
            },
        },
    })
    @ApiInternalServerErrorResponse({ type: InternalServerErrorDTO })
    @HttpCode(HttpStatus.OK)
    async getContractAddress(
        @AuthUser() user: IAuthUser,
        @Response() res: any
    ): Promise<{ contractAddress: string; networkName: string }> {
        try {
            const guardians = new Guardians();
            const result = await guardians.sendMessage(
                { type: 'ORACLE_GET_CONTRACT' },
                user
            );
            return res.send(result);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }
}
