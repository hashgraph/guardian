import crypto from "crypto";
import {User} from '@entity/user';
import {getMongoRepository} from 'typeorm';
import {UserRole} from "interfaces";

export const fixtures = async function (): Promise<void> {
    const usersRepository = getMongoRepository(User);
    // Fixture user
    if (await usersRepository.count() === 0) {
        let user = usersRepository.create({
            username: 'RootAuthority',
            password: crypto.createHash('sha256').update('test').digest('hex'),
            walletToken: crypto.createHash('sha1').update(Math.random().toString()).digest('hex'),
            role: UserRole.ROOT_AUTHORITY,
            did: "did"
        });
        let result = await usersRepository.save(user);
        console.log(result, crypto.createHash('sha1').update(Math.random().toString()).digest('hex'));

        user = usersRepository.create({
            username: 'Installer',
            password: crypto.createHash('sha256').update('test').digest('hex'),
            walletToken: crypto.createHash('sha1').update(Math.random().toString()).digest('hex'),
            role: UserRole.INSTALLER
        });
        result = await usersRepository.save(user);
        console.log(result, crypto.createHash('sha1').update(Math.random().toString()).digest('hex'));

        user = usersRepository.create({
            username: 'Installer2',
            password: crypto.createHash('sha256').update('test').digest('hex'),
            walletToken: crypto.createHash('sha1').update(Math.random().toString()).digest('hex'),
            role: UserRole.INSTALLER
        });
        result = await usersRepository.save(user);
        console.log(result, crypto.createHash('sha1').update(Math.random().toString()).digest('hex'));

        user = usersRepository.create({
            username: 'Auditor',
            password: crypto.createHash('sha256').update('test').digest('hex'),
            walletToken: crypto.createHash('sha1').update(Math.random().toString()).digest('hex'),
            role: UserRole.AUDITOR
        });
        result = await usersRepository.save(user);
        console.log(result, crypto.createHash('sha1').update(Math.random().toString()).digest('hex'));

        user = usersRepository.create({
            username: 'Originator',
            password: crypto.createHash('sha256').update('test').digest('hex'),
            walletToken: crypto.createHash('sha1').update(Math.random().toString()).digest('hex'),
            role: UserRole.ORIGINATOR
        });
        result = await usersRepository.save(user);
        console.log(result, crypto.createHash('sha1').update(Math.random().toString()).digest('hex'));
    }
}