import moduleAlias from 'module-alias';
import dotenv from 'dotenv';
import 'reflect-metadata';

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
