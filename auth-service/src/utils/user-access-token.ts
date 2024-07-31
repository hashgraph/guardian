import { SecretManager } from "@guardian/common";
import { IUser, GenerateUUIDv4 } from "@guardian/interfaces";
import pkg from 'jsonwebtoken';
import * as util from 'util';

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

    private readonly ACCESS_TOKEN_SECRET: string;

    constructor(accessTokenSecret: string) {
        this.ACCESS_TOKEN_SECRET = accessTokenSecret;
    }

    public generateRefreshToken(user: IUser): IToken {
        const REFRESH_TOKEN_UPDATE_INTERVAL =
            process.env.REFRESH_TOKEN_UPDATE_INTERVAL ||
            UserAccessTokenService.REFRESH_TOKEN_UPDATE_INTERVAL;
        const tokenId = GenerateUUIDv4();
        const refreshToken = sign({
            id: tokenId,
            name: user.username,
            expireAt: Date.now() + parseInt(REFRESH_TOKEN_UPDATE_INTERVAL, 10)
        }, this.ACCESS_TOKEN_SECRET);
        return {
            id: tokenId,
            token: refreshToken
        };
    }

    public async verifyRefreshToken(refreshToken: string): Promise<{
        id: string,
        name: string,
        expireAt: number
    }> {
        return await util.promisify<string, any, Object, any>(verify)(refreshToken, this.ACCESS_TOKEN_SECRET, {});
    }

    public generateAccessToken(user: IUser, expire: boolean): string {
        if (expire) {
            const ACCESS_TOKEN_UPDATE_INTERVAL =
                process.env.ACCESS_TOKEN_UPDATE_INTERVAL ||
                UserAccessTokenService.ACCESS_TOKEN_UPDATE_INTERVAL;
            const accessToken = sign({
                username: user.username,
                did: user.did,
                role: user.role,
                expireAt: Date.now() + parseInt(ACCESS_TOKEN_UPDATE_INTERVAL, 10)
            }, this.ACCESS_TOKEN_SECRET);
            return accessToken;
        } else {
            const accessToken = sign({
                username: user.username,
                did: user.did,
                role: user.role
            }, this.ACCESS_TOKEN_SECRET);
            return accessToken;
        }
    }

    public async verifyAccessToken(accessToken: string): Promise<{
        username: string,
        did: string,
        role: string,
        expireAt?: number
    }> {
        return await util.promisify<string, any, Object, any>(verify)(accessToken, this.ACCESS_TOKEN_SECRET, {});
    }

    public static async New(): Promise<UserAccessTokenService> {
        const secretManager = SecretManager.New();
        const { ACCESS_TOKEN_SECRET } = await secretManager.getSecrets('secretkey/auth');
        return new UserAccessTokenService(ACCESS_TOKEN_SECRET);
    }
}
