import moduleAlias from 'module-alias';
import dotenv from 'dotenv';
import 'reflect-metadata';
import fs from 'fs';

moduleAlias.addAliases({
    '@api': __dirname + '/api',
    '@entity': __dirname + '/entity',
    '@helpers': __dirname + '/helpers',
    '@policy-engine': __dirname + '/policy-engine',
    '@hedera-modules': __dirname + '/hedera-modules/index',
    '@database-modules': __dirname + '/database-modules/index',
    '@document-loader': __dirname + '/document-loader',
    '@analytics': __dirname + '/analytics/index'
});

dotenv.config();

const envPath = process.env.GUARDIAN_ENV ? `./configs/.env.policy.${process.env.GUARDIAN_ENV}` : './configs/.env.policy';

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
