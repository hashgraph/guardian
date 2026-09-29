import dotenv from 'dotenv';
import 'reflect-metadata';
import fs from 'node:fs';

dotenv.config();

const envPath = process.env.GUARDIAN_ENV ? `./configs/.env.guardian.${process.env.GUARDIAN_ENV}` : './configs/.env.guardian';

if (!process.env.OVERRIDE || process.env.OVERRIDE === 'false'){
    console.log('reading from', envPath, 'not overriding');
    dotenv.config({ path: envPath});
}else{
    try {
        const envConfig = dotenv.parse(fs.readFileSync(envPath));
        for (const [k, value] of Object.entries(envConfig)) {
            process.env[k] = value
        }
    } catch (err) {
        if (err.code === 'ENOENT') {
            console.log('WARN: Specific environment not loaded');
        } else {
            throw err;
        }
    }
}
