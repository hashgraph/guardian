import moduleAlias from 'module-alias';
import dotenv from 'dotenv';

moduleAlias.addAliases({
    "@api": __dirname + "/api",
    "@entity": __dirname + "/entity",
    "@helpers": __dirname + "/helpers"
});

dotenv.config();
