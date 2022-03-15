import axios from 'axios';
import type { IUser } from '../user';

export async function publishSchemasToUiService({
  schemaIds,
  rootAuthority,
  uiServiceBaseUrl,
}: {
  uiServiceBaseUrl: string;
  schemaIds: string[];
  rootAuthority: IUser;
}) {
  for (let schemaId of schemaIds) {
    await axios.post(
      `${uiServiceBaseUrl}/api/schema/publish`,
      { id: schemaId },
      {
        headers: {
          authorization: `Bearer ${rootAuthority.accessToken}`,
        },
      },
    );
  }
}
