import moduleAlias from 'module-alias';
import dotenv from 'dotenv';
import fs from 'fs';

moduleAlias.addAliases({
    '@api': __dirname + '/api',
    '@entity': __dirname + '/entity',
    '@helpers': __dirname + '/helpers'
});

dotenv.config();

const envPath = process.env.GUARDIAN_ENV ? `./configs/.env.auth.${process.env.GUARDIAN_ENV}` : './configs/.env.auth';

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
