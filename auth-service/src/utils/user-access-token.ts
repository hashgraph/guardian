import { SecretManager } from '@guardian/common';
import { GenerateUUIDv4, IUser } from '@guardian/interfaces';
import { InternalServerErrorException } from '@nestjs/common';
import pkg from 'jsonwebtoken';
import * as util from 'node:util';

const { sign, verify } = pkg;

export interface IToken {
    id: string,
    token: string
}

/**
 * Password Utils
 */
export class UserAccessTokenService {
    private static readonly REFRESH_TOKEN_UPDATE_INTERVAL = '31536000000'; // 1 year
    private static readonly ACCESS_TOKEN_UPDATE_INTERVAL = '60000';

    private readonly JWT_PRIVATE_KEY: string;
    private readonly JWT_PUBLIC_KEY: string;

    constructor(jwtPrivateKey: string, jwtPublicKey: string) {
        this.JWT_PRIVATE_KEY = jwtPrivateKey;
        this.JWT_PUBLIC_KEY = jwtPublicKey;
    }

    public static async New(): Promise<UserAccessTokenService> {
        const secretManager = SecretManager.New();
        const {JWT_PUBLIC_KEY, JWT_PRIVATE_KEY} = await secretManager.getSecrets('secretkey/auth');
        return new UserAccessTokenService(JWT_PRIVATE_KEY, JWT_PUBLIC_KEY);
    }

    public generateRefreshToken(user: IUser): IToken {
        try {
            const REFRESH_TOKEN_UPDATE_INTERVAL =
                process.env.REFRESH_TOKEN_UPDATE_INTERVAL ||
                UserAccessTokenService.REFRESH_TOKEN_UPDATE_INTERVAL;
            const tokenId = GenerateUUIDv4();
            const refreshToken = sign({
                id: tokenId,
                name: user.username,
                expireAt: Date.now() + parseInt(REFRESH_TOKEN_UPDATE_INTERVAL, 10)
            }, this.JWT_PRIVATE_KEY, {
                algorithm: 'RS256'
            });
            return {
                id: tokenId,
                token: refreshToken
            };
        } catch (err) {
            console.error(err);
            throw new InternalServerErrorException('JWT keys are invalid or misconfigured');
        }

    }

    public async verifyRefreshToken(refreshToken: string): Promise<{
        id: string,
        name: string,
        expireAt: number
    }> {
        try {
            return await util.promisify<string, any, Object, any>(verify)(refreshToken, this.JWT_PUBLIC_KEY, {
                algorithms: ['RS256']
            });
        } catch (err) {
            console.error(err);
            throw new InternalServerErrorException('JWT keys are invalid or misconfigured');
        }
    }

    public generateAccessToken(user: IUser, expire: boolean): string {
        try {
            if (expire) {
                const ACCESS_TOKEN_UPDATE_INTERVAL =
                    process.env.ACCESS_TOKEN_UPDATE_INTERVAL ||
                    UserAccessTokenService.ACCESS_TOKEN_UPDATE_INTERVAL;
                const accessToken = sign({
                    username: user.username,
                    did: user.did,
                    role: user.role,
                    expireAt: Date.now() + parseInt(ACCESS_TOKEN_UPDATE_INTERVAL, 10)
                }, this.JWT_PRIVATE_KEY, {
                    algorithm: 'RS256'
                });
                return accessToken;
            } else {
                const accessToken = sign({
                    username: user.username,
                    did: user.did,
                    role: user.role
                }, this.JWT_PRIVATE_KEY, {
                    algorithm: 'RS256'
                });
                return accessToken;
            }
        } catch (err) {
            console.error(err);
            throw new InternalServerErrorException('JWT keys are invalid or misconfigured');
        }
    }

    public async verifyAccessToken(accessToken: string): Promise<{
        username: string,
        did: string,
        role: string,
        expireAt?: number
    }> {
        try {
            return await util.promisify<string, any, Object, any>(verify)(accessToken, this.JWT_PUBLIC_KEY, {
                algorithms: ['RS256']
            });
        } catch (err) {
            console.error(err);
            throw new InternalServerErrorException('JWT keys are invalid or misconfigured');
        }
    }
}
