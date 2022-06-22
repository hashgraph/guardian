import moduleAlias from 'module-alias';
import dotenv from 'dotenv';

moduleAlias.addAliases({
    "@api": __dirname + "/api",
    "@entity": __dirname + "/entity"
});

dotenv.config();
