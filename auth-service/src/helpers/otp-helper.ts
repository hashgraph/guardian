import { Totp, generateBackupCodes } from 'time2fa';
import { OtpSecret } from '../entity/otp-secret.js';
import { DataBaseHelper } from '@guardian/common';
import { User } from '../entity/user.js';

export class OtpHelper {

    private static getFilter(user: User) {
        return { userId: user.id }
    }

    private static async deleteOtp(user: User): Promise<void> {
        await new DataBaseHelper(OtpSecret).delete({ ...OtpHelper.getFilter(user), enabled: true });
    }

    private static async getOtp(user: User): Promise<OtpSecret> {
        return await new DataBaseHelper(OtpSecret).findOne({ ...OtpHelper.getFilter(user), enabled: true });
    }

    private static getAccountName(user: User): string {
        return `${user.username}`;
    }

    public static async generateNewSecretFor(user: User) {

        //Delete prev temp secret if exists
        await new DataBaseHelper(OtpSecret).delete({ ...OtpHelper.getFilter(user), enabled: false });

        //Generate secret
        const key = Totp.generateKey({ issuer: 'OS Guardian', user: OtpHelper.getAccountName(user) });
        const entity = await new DataBaseHelper(OtpSecret).create({
            userId: user.id,
            secret: key.secret,
            config: key.config,
            encrypted: false,
            enabled: false
        });
        new DataBaseHelper(OtpSecret).save(entity);

        return key;
    }

    public static async confirmNewSecret(user: User, token: string): Promise<boolean> {
        const temp = await new DataBaseHelper(OtpSecret).findOne({ ...OtpHelper.getFilter(user), enabled: false });
        if (!temp) {
            return false;
        }
        try {
            const valid = Totp.validate({ passcode: token, secret: temp.secret });
            if (!valid) { return false; }
            //Delete prev secret if exists
            await OtpHelper.deleteOtp(user);
            temp.enabled = true;
            await new DataBaseHelper(OtpSecret).save(temp);

        } catch (e) {
            return false;
        }
        return true;
    }

    public static async generateBackupCodes(user: User): Promise<string[] | undefined> {
        const otp = await OtpHelper.getOtp(user);
        if (!otp) { return undefined; }
        if (otp.backupCodes && otp.backupCodes.length > 0) { throw new Error('Backup codes already cenerated'); }
        otp.backupCodes = generateBackupCodes();
        await new DataBaseHelper(OtpSecret).save(otp);
        return otp.backupCodes;
    }

    public static async isConfiguredFor(user: User): Promise<boolean> {
        const key = await OtpHelper.getOtp(user);
        if (key) { return true }
        else { return false }
    }

    public static async isValidToken(user: User, token: string): Promise<boolean> {

        const key = await OtpHelper.getOtp(user);
        if (!key) {
            return false;// not configured
        }

        if (!token) {
            return false;// configured but not provided
        }

        const result = Totp.validate({ passcode: token, secret: key.secret })
        return result;

    }

    /**
     * Check user otp if required
     * @returns
     */
    public static async checkOtp(user: User, token: string): Promise<boolean> {
        const configured = await OtpHelper.isConfiguredFor(user);
        if (!configured) {
            return true; //Not required - ignore
        }
        if (!token) {
            return false; //Required and empty otp - reject
        }
        //Validate otp
        try {
            const isValid = OtpHelper.isValidToken(user, token);
            return isValid;
        }
        catch (e) {
            return false;
        }
    }

    public static async deactivate(user: User): Promise<any> {
        await OtpHelper.deleteOtp(user);
    }
}