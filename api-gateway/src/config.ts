import moduleAlias from 'module-alias';
import dotenv from 'dotenv';
import 'reflect-metadata'

moduleAlias.addAliases({
    '@api': __dirname + '/api',
    '@subscribers': __dirname + 'dist/subscribers',
    '@helpers': __dirname + '/helpers',
    '@auth': __dirname + '/auth',
    '@middlewares': __dirname + '/middlewares',
});

dotenv.config();
