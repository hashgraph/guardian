import assert from 'assert';
import axios from 'axios';
import { Request, Response, Router } from 'express';
import type { ISchema } from 'interfaces';
import { publishSchemasToUiService } from '../modules/schema';
import { loginToUiService } from '../modules/user';

export const makeSchemaApi = ({
  uiServiceBaseUrl,
}: {
  uiServiceBaseUrl: string;
}) => {
  const schemaApi = Router();

  schemaApi.post('/import', async (req: Request, res: Response) => {
    const { schema: inputSchema, publish }: IImportBody = req.body;

    assert(inputSchema, `schema is missing`);
    assert(inputSchema.uuid, `schema.uuid is missing`);

    const rootAuthority = await loginToUiService({
      uiServiceBaseUrl,
      username: 'RootAuthority',
    });

    const { data: allSchemas } = (await axios.post(
      `${uiServiceBaseUrl}/api/schema/import`,
      { schemes: [inputSchema] },
      {
        headers: {
          authorization: `Bearer ${rootAuthority.accessToken}`,
          'content-type': 'application/json',
        },
      },
    )) as { data: ISchema[] };

    const importedSchema = allSchemas.find(
      (schema) => schema.uuid === inputSchema.uuid,
    );

    assert(importedSchema, `Failed to import schema ${inputSchema.uuid}`);

    if (publish && importedSchema.status !== 'PUBLISHED') {
      await publishSchemasToUiService({
        uiServiceBaseUrl,
        rootAuthority,
        schemaIds: [importedSchema.id],
      });
    } else {
      console.log(`Schema: ${importedSchema.uuid} already published`);
    }

    res.status(200).json(importedSchema);
  });

  return schemaApi;
};

interface IImportBody {
  schema?: ISchema;
  publish: boolean;
}
