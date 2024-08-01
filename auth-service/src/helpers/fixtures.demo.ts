import { User } from '../entity/user.js';
import { UserRole } from '@guardian/interfaces';
import { DataBaseHelper } from '@guardian/common';
import { UserPassword } from '#utils';

/**
 * Create default users
 */
export async function fixtures(): Promise<void> {
    const usersRepository = new DataBaseHelper(User);
    // Fixture user
    if (await usersRepository.count() === 0) {
        const users = [{
            username: 'StandardRegistry',
            role: UserRole.STANDARD_REGISTRY,
            // walletToken: crypto.createHash('sha1').update(Math.random().toString()).digest('hex')
            walletToken: ''
        }, {
            username: 'Installer',
            role: UserRole.USER,
            // walletToken: crypto.createHash('sha1').update(Math.random().toString()).digest('hex')
            walletToken: ''
        }, {
            username: 'Installer2',
            role: UserRole.USER,
            // walletToken: crypto.createHash('sha1').update(Math.random().toString()).digest('hex')
            walletToken: ''
        }, {
            username: 'Auditor',
            role: UserRole.AUDITOR,
            // walletToken: crypto.createHash('sha1').update(Math.random().toString()).digest('hex')
            walletToken: ''
        }, {
            username: 'Registrant',
            role: UserRole.USER,
            // walletToken: crypto.createHash('sha1').update(Math.random().toString()).digest('hex')
            walletToken: ''
        }, {
            username: 'VVB',
            role: UserRole.USER,
            // walletToken: crypto.createHash('sha1').update(Math.random().toString()).digest('hex')
            walletToken: ''
        }, {
            username: 'ProjectProponent',
            role: UserRole.USER,
            // walletToken: crypto.createHash('sha1').update(Math.random().toString()).digest('hex')
            walletToken: ''
        }, {
            username: 'Verra',
            role: UserRole.STANDARD_REGISTRY,
            // walletToken: crypto.createHash('sha1').update(Math.random().toString()).digest('hex')
            walletToken: ''
        }];
        for (const user of users) {
            const password = await UserPassword.generatePasswordV2('test');
            const row = usersRepository.create({
                ...user,
                password: password.password,
                salt: password.salt,
                passwordVersion: password.passwordVersion,
            });
            await usersRepository.save(row);
        }
    }
}
