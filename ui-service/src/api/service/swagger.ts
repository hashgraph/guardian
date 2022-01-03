import {Request, Response, Router} from 'express';
import yaml, { JSON_SCHEMA } from 'js-yaml';
import path from 'path';
import swaggerUi from 'swagger-ui-express';
import {readFileSync} from 'fs';

function ReadSwaggerConfig() {
    const configPath = path.join(process.cwd(), 'api', 'swagger', 'swagger.yaml');
    const swaggerYaml = readFileSync(configPath, 'utf-8');

    return yaml.load(swaggerYaml, {
        schema: JSON_SCHEMA,
        json: false
    });
}

export const swaggerAPI = Router();

swaggerAPI.use('/', swaggerUi.serve);
swaggerAPI.get('/', swaggerUi.setup(ReadSwaggerConfig(), false));
