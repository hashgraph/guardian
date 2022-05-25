import moduleAlias from 'module-alias';
import dotenv from 'dotenv';

moduleAlias.addAliases({
    "@api": __dirname + "/api"
});

dotenv.config();

if (!process.env.NFT_API_KEY || process.env.NFT_API_KEY.length < 20) {
    throw ('You need to fill NFT_API_KEY field in .env file');
}
