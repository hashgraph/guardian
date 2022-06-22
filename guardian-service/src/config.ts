import moduleAlias from 'module-alias';
import dotenv from 'dotenv';
import 'reflect-metadata';
import { AccountId, PrivateKey, TopicId } from '@hashgraph/sdk';

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
