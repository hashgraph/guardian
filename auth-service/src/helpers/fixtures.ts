import { User } from '../entity/user.js';
import { UserRole } from '@guardian/interfaces';
import { DatabaseServer } from '@guardian/common';
import { UserPassword } from '#utils';
import process from 'node:process';

/**
 * Create default users
 */
export async function fixtures(): Promise<void> {
    const usersRepository = new DatabaseServer();
    // Fixture user
    if ((await usersRepository.count(User, null)) === 0) {
        const users = [{
            username: 'StandardRegistry',
            role: UserRole.STANDARD_REGISTRY,
            //walletToken: crypto.createHash('sha1').update(Math.random().toString()).digest('hex')
            walletToken: ''
        }]

        for (const user of users) {
            const password = await UserPassword.generatePasswordV2(process.env.SR_INITIAL_PASSWORD || 'test');
            const row = usersRepository.create(User, {
                ...user,
                password: password.password,
                salt: password.salt,
                passwordVersion: password.passwordVersion,
            });
            await usersRepository.save(User, row);
        }
    }
}
