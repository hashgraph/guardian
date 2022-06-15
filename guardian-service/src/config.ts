import moduleAlias from 'module-alias';
import dotenv from 'dotenv';
import 'reflect-metadata';
import { AccountId, PrivateKey } from '@hashgraph/sdk';

moduleAlias.addAliases({
    "@api": __dirname + "/api",
    "@entity": __dirname + "/entity",
    "@subscribers": __dirname + "dist/subscribers",
    "@helpers": __dirname + "/helpers",
    "@auth": __dirname + "/auth",
    "@policy-engine": __dirname + "/policy-engine",
    "@hedera-modules": __dirname + "/hedera-modules/index",
    "@document-loader": __dirname + "/document-loader"
});

dotenv.config();

if(!process.env.OPERATOR_ID || process.env.OPERATOR_ID.length<5) {
    throw ('You need to fill OPERATOR_ID field in .env file');
}

if(!process.env.OPERATOR_KEY || process.env.OPERATOR_KEY.length<5) {
    throw ('You need to fill OPERATOR_KEY field in .env file');
}

try {
    const accountId = AccountId.fromString(process.env.OPERATOR_ID);
} catch (error) {
    throw ('OPERATOR_ID field in .env file: ' + error.message);
}

try {
    const accountKey = PrivateKey.fromString(process.env.OPERATOR_KEY);
} catch (error) {
    throw ('OPERATOR_KEY field in .env file: ' + error.message);
}
