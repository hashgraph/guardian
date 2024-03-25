import dotenv from 'dotenv';
import 'reflect-metadata';
import fs from 'fs';

dotenv.config();

const envPath = process.env.GUARDIAN_ENV ? `./configs/.env.worker.${process.env.GUARDIAN_ENV}` : './configs/.env.worker';

if (!process.env.OVERRIDE || process.env.OVERRIDE === 'false'){
    console.log('reading from', envPath, 'not overriding');
    dotenv.config({ path: envPath});
}else{
    try {
        const envConfig = dotenv.parse(fs.readFileSync(envPath));
        for (const k of Object.keys(envConfig)) {
            process.env[k] = envConfig[k]
        }
    } catch (err) {
        if (err.code === 'ENOENT') {
            console.log('WARN: Specific environment not loaded');
        } else {
            throw err;
        }
    }
}
console.log('Charged Environment',process.env,'\r\n___ . ___');
