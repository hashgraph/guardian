import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Put, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Auth, AuthUser } from '#auth';
import {
    Permissions,
    SERVICE_CREDENTIAL_SCHEMAS,
} from '@guardian/interfaces';
import { Guardians, InternalException } from '#helpers';
import { IAuthUser, PinoLogger } from '@guardian/common';

/**
 * Credentials route
 */
@Controller('credentials')
@ApiTags('credentials')
export class CredentialsApi {
    constructor(private readonly logger: PinoLogger) {
    }

    @Get('/services')
    @Auth(Permissions.CREDENTIALS_USER_READ)
    @ApiOperation({ summary: 'Get supported external service credential schemas.' })
    @HttpCode(HttpStatus.OK)
    async getServiceSchemas(
        @AuthUser() user: IAuthUser,
    ): Promise<any> {
        try {
            return SERVICE_CREDENTIAL_SCHEMAS;
        } catch (error) {
            await InternalException(error, this.logger, user?.id);
        }
    }

    // ==================== User Global ====================

    @Get('/user/global')
    @Auth(Permissions.CREDENTIALS_USER_READ)
    @ApiOperation({ summary: 'Get user global credentials.' })
    @HttpCode(HttpStatus.OK)
    async getUserGlobalCredentials(
        @AuthUser() user: IAuthUser,
    ): Promise<any> {
        try {
            const guardians = new Guardians();
            return await guardians.getCredentials(user, null);
        } catch (error) {
            await InternalException(error, this.logger, user?.id);
        }
    }

    @Put('/user/global')
    @Auth(Permissions.CREDENTIALS_USER_WRITE)
    @ApiOperation({ summary: 'Set user global credential.' })
    @HttpCode(HttpStatus.OK)
    async setUserGlobalCredential(
        @Body() body: any,
        @AuthUser() user: IAuthUser,
    ): Promise<any> {
        try {
            const guardians = new Guardians();
            return await guardians.setCredential(user, null, body);
        } catch (error) {
            await InternalException(error, this.logger, user?.id);
        }
    }

    @Delete('/user/global')
    @Auth(Permissions.CREDENTIALS_USER_WRITE)
    @ApiOperation({ summary: 'Delete user global credential.' })
    @HttpCode(HttpStatus.NO_CONTENT)
    async deleteUserGlobalCredential(
        @Query('serviceType') serviceType: string,
        @Query('dryRun') dryRun: string,
        @AuthUser() user: IAuthUser,
    ): Promise<any> {
        try {
            const guardians = new Guardians();
            return await guardians.deleteCredential(user, null, serviceType, dryRun === 'true');
        } catch (error) {
            await InternalException(error, this.logger, user?.id);
        }
    }

    // ==================== User Policy ====================

    @Get('/user/policy/:policyId')
    @Auth(Permissions.CREDENTIALS_USER_READ)
    @ApiOperation({ summary: 'Get user policy credentials.' })
    @HttpCode(HttpStatus.OK)
    async getUserPolicyCredentials(
        @Param('policyId') policyId: string,
        @AuthUser() user: IAuthUser,
    ): Promise<any> {
        try {
            const guardians = new Guardians();
            return await guardians.getCredentials(user, policyId);
        } catch (error) {
            await InternalException(error, this.logger, user?.id);
        }
    }

    @Put('/user/policy/:policyId')
    @Auth(Permissions.CREDENTIALS_USER_WRITE)
    @ApiOperation({ summary: 'Set user policy credential.' })
    @HttpCode(HttpStatus.OK)
    async setUserPolicyCredential(
        @Param('policyId') policyId: string,
        @Body() body: any,
        @AuthUser() user: IAuthUser,
    ): Promise<any> {
        try {
            const guardians = new Guardians();
            return await guardians.setCredential(user, policyId, body);
        } catch (error) {
            await InternalException(error, this.logger, user?.id);
        }
    }

    @Delete('/user/policy/:policyId')
    @Auth(Permissions.CREDENTIALS_USER_WRITE)
    @ApiOperation({ summary: 'Delete user policy credential.' })
    @HttpCode(HttpStatus.NO_CONTENT)
    async deleteUserPolicyCredential(
        @Param('policyId') policyId: string,
        @Query('serviceType') serviceType: string,
        @Query('dryRun') dryRun: string,
        @AuthUser() user: IAuthUser,
    ): Promise<any> {
        try {
            const guardians = new Guardians();
            return await guardians.deleteCredential(user, policyId, serviceType, dryRun === 'true');
        } catch (error) {
            await InternalException(error, this.logger, user?.id);
        }
    }

    // ==================== SR Global ====================

    @Get('/sr/global')
    @Auth(Permissions.CREDENTIALS_SR_READ)
    @ApiOperation({ summary: 'Get SR global credentials.' })
    @HttpCode(HttpStatus.OK)
    async getSrGlobalCredentials(
        @AuthUser() user: IAuthUser,
    ): Promise<any> {
        try {
            const guardians = new Guardians();
            return await guardians.getCredentials(user, null);
        } catch (error) {
            await InternalException(error, this.logger, user?.id);
        }
    }

    @Put('/sr/global')
    @Auth(Permissions.CREDENTIALS_SR_WRITE)
    @ApiOperation({ summary: 'Set SR global credential.' })
    @HttpCode(HttpStatus.OK)
    async setSrGlobalCredential(
        @Body() body: any,
        @AuthUser() user: IAuthUser,
    ): Promise<any> {
        try {
            const guardians = new Guardians();
            return await guardians.setCredential(user, null, body);
        } catch (error) {
            await InternalException(error, this.logger, user?.id);
        }
    }

    @Delete('/sr/global')
    @Auth(Permissions.CREDENTIALS_SR_WRITE)
    @ApiOperation({ summary: 'Delete SR global credential.' })
    @HttpCode(HttpStatus.NO_CONTENT)
    async deleteSrGlobalCredential(
        @Query('serviceType') serviceType: string,
        @Query('dryRun') dryRun: string,
        @AuthUser() user: IAuthUser,
    ): Promise<any> {
        try {
            const guardians = new Guardians();
            return await guardians.deleteCredential(user, null, serviceType, dryRun === 'true');
        } catch (error) {
            await InternalException(error, this.logger, user?.id);
        }
    }

    // ==================== SR Policy ====================

    @Get('/sr/policy/:policyId')
    @Auth(Permissions.CREDENTIALS_SR_READ)
    @ApiOperation({ summary: 'Get SR policy credentials.' })
    @HttpCode(HttpStatus.OK)
    async getSrPolicyCredentials(
        @Param('policyId') policyId: string,
        @AuthUser() user: IAuthUser,
    ): Promise<any> {
        try {
            const guardians = new Guardians();
            return await guardians.getCredentials(user, policyId);
        } catch (error) {
            await InternalException(error, this.logger, user?.id);
        }
    }

    @Put('/sr/policy/:policyId')
    @Auth(Permissions.CREDENTIALS_SR_WRITE)
    @ApiOperation({ summary: 'Set SR policy credential.' })
    @HttpCode(HttpStatus.OK)
    async setSrPolicyCredential(
        @Param('policyId') policyId: string,
        @Body() body: any,
        @AuthUser() user: IAuthUser,
    ): Promise<any> {
        try {
            const guardians = new Guardians();
            return await guardians.setCredential(user, policyId, body);
        } catch (error) {
            await InternalException(error, this.logger, user?.id);
        }
    }

    @Delete('/sr/policy/:policyId')
    @Auth(Permissions.CREDENTIALS_SR_WRITE)
    @ApiOperation({ summary: 'Delete SR policy credential.' })
    @HttpCode(HttpStatus.NO_CONTENT)
    async deleteSrPolicyCredential(
        @Param('policyId') policyId: string,
        @Query('serviceType') serviceType: string,
        @Query('dryRun') dryRun: string,
        @AuthUser() user: IAuthUser,
    ): Promise<any> {
        try {
            const guardians = new Guardians();
            return await guardians.deleteCredential(user, policyId, serviceType, dryRun === 'true');
        } catch (error) {
            await InternalException(error, this.logger, user?.id);
        }
    }
}
