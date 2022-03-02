import fs from 'fs';
import glob from 'glob';
import { join } from 'path';
import { promisify } from 'util';
import { getPolicyFolders } from './getPolicyFolders';

const globAsync = promisify(glob);

const { readFile, writeFile } = fs.promises;

export async function decodeSchemas() {
  const policyFolders = await getPolicyFolders();

  await Promise.all(
    policyFolders.map(async (folder) => {
      const files = await globAsync(`**/*.json`, { cwd: folder });

      const schemaFiles = files.filter((file) => file.startsWith('schemas/'));

      await Promise.all(
        schemaFiles.map(async (schemaFile) => {
          const schema = JSON.parse(
            await readFile(join(folder, schemaFile), 'utf-8'),
          );

          if (typeof schema.document !== 'string') {
            console.log(
              `Skip decoding of ${schemaFile} because it is already decoded`,
            );
            return;
          }

          console.log('Decoding', schemaFile);
          const newSchema = {
            ...schema,
            document: JSON.parse(schema.document),
          };

          await writeFile(
            join(folder, schemaFile),
            JSON.stringify(newSchema, undefined, 2),
          );
        }),
      );
    }),
  );
}
