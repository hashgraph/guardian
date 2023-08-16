import crypto from 'crypto';
import { User } from '@entity/user';
import { UserRole } from '@guardian/interfaces';
import { DataBaseHelper } from '@guardian/common';

/**
 * Create default users
 */
export async function fixtures(): Promise<void> {
    const usersRepository = new DataBaseHelper(User);
    // Fixture user
    if (await usersRepository.count() === 0) {
        let user = usersRepository.create({
            username: 'StandardRegistry',
            password: crypto.createHash('sha256').update('test').digest('hex'),
            walletToken: crypto.createHash('sha1').update(Math.random().toString()).digest('hex'),
            role: UserRole.STANDARD_REGISTRY
        });
        await usersRepository.save(user);

        user = usersRepository.create({
            username: 'Installer',
            password: crypto.createHash('sha256').update('test').digest('hex'),
            walletToken: crypto.createHash('sha1').update(Math.random().toString()).digest('hex'),
            role: UserRole.USER
        });
        await usersRepository.save(user);

        user = usersRepository.create({
            username: 'Installer2',
            password: crypto.createHash('sha256').update('test').digest('hex'),
            walletToken: crypto.createHash('sha1').update(Math.random().toString()).digest('hex'),
            role: UserRole.USER
        });
        await usersRepository.save(user);

        user = usersRepository.create({
            username: 'Auditor',
            password: crypto.createHash('sha256').update('test').digest('hex'),
            walletToken: crypto.createHash('sha1').update(Math.random().toString()).digest('hex'),
            role: UserRole.AUDITOR
        });
        await usersRepository.save(user);

        user = usersRepository.create({
            username: 'Registrant',
            password: crypto.createHash('sha256').update('test').digest('hex'),
            walletToken: crypto.createHash('sha1').update(Math.random().toString()).digest('hex'),
            role: UserRole.USER
        });
        await usersRepository.save(user);

        user = usersRepository.create({
            username: 'VVB',
            password: crypto.createHash('sha256').update('test').digest('hex'),
            walletToken: crypto.createHash('sha1').update(Math.random().toString()).digest('hex'),
            role: UserRole.USER
        });
        await usersRepository.save(user);

        user = usersRepository.create({
            username: 'ProjectProponent',
            password: crypto.createHash('sha256').update('test').digest('hex'),
            walletToken: crypto.createHash('sha1').update(Math.random().toString()).digest('hex'),
            role: UserRole.USER
        });
        await usersRepository.save(user);

        user = usersRepository.create({
            username: 'Verra',
            password: crypto.createHash('sha256').update('test').digest('hex'),
            walletToken: crypto.createHash('sha1').update(Math.random().toString()).digest('hex'),
            role: UserRole.STANDARD_REGISTRY
        });
        await usersRepository.save(user);
    }
}
