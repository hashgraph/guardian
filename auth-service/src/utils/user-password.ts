import { randomBytes, pbkdf2, createHash } from 'node:crypto';
import { User } from '../entity/user.js';
import { PasswordComplexityEnum, minPasswordLength, passwordComplexity } from '#constants';

export interface IPassword {
    password: string,
    salt: string,
    passwordVersion: string
}

export enum PasswordType {
    V1 = 'v1',
    V2 = 'v2'
}

/**
 * Password Utils
 */
export class UserPassword {
    private static readonly ITERATIONS = 600000;
    private static readonly KEY_LENGTH = 64;
    private static readonly SALT_LENGTH = 16;

    public static async generatePasswordV1(password: string): Promise<IPassword> {
        const passwordDigest = createHash('sha256').update(password).digest('hex');
        return {
            password: passwordDigest,
            salt: null,
            passwordVersion: PasswordType.V1
        };
    }

    public static async verifyPasswordV1(
        originalPassword: IPassword | User,
        currentPassword: string
    ): Promise<boolean> {
        if (!originalPassword) {
            return false;
        }
        const passwordDigest = createHash('sha256').update(currentPassword).digest('hex');
        return passwordDigest === originalPassword.password;
    }

    public static async generatePasswordV2(password: string): Promise<IPassword> {
        return new Promise((resolve, reject) => {
            const salt = randomBytes(UserPassword.SALT_LENGTH).toString('hex');
            pbkdf2(
                password,
                salt,
                UserPassword.ITERATIONS,
                UserPassword.KEY_LENGTH,
                'sha512',
                (err, derivedKey) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve({
                            password: derivedKey.toString('hex'),
                            salt,
                            passwordVersion: PasswordType.V2
                        });
                    }
                });
        });
    }

    public static async verifyPasswordV2(
        originalPassword: IPassword | User,
        currentPassword: string
    ): Promise<boolean> {
        return new Promise((resolve, reject) => {
            if (!originalPassword) {
                resolve(false);
                return;
            }
            const { password, salt } = originalPassword;
            pbkdf2(
                currentPassword,
                salt,
                UserPassword.ITERATIONS,
                UserPassword.KEY_LENGTH,
                'sha512',
                (err, derivedKey) => {
                    if (err) {
                        reject(err);
                    } else {
                        const currentHash = derivedKey.toString('hex');
                        resolve(currentHash === password);
                    }
                });
        });
    }

    public static async verifyPassword(
        originalPassword: IPassword | User,
        currentPassword: string
    ): Promise<boolean> {
        if (!originalPassword) {
            return false;
        }
        if (originalPassword.passwordVersion === PasswordType.V2) {
            return await UserPassword.verifyPasswordV2(originalPassword, currentPassword)
        } else {
            return await UserPassword.verifyPasswordV1(originalPassword, currentPassword)
        }
    }

    public static validatePassword(password: string) {
        if (password.length < minPasswordLength) {
            return false;
        }

        let pattern: RegExp | null = null;

        switch (passwordComplexity) {
          case PasswordComplexityEnum.MEDIUM:
            pattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;
            break;
          case PasswordComplexityEnum.HARD:
            pattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w]).+$/;
            break;
          case PasswordComplexityEnum.EASY:
          default:
            break;
        }

        if (pattern) {
            return pattern.test(password);
        }

        return true;
    }
}