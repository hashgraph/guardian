import assert from 'assert';
import axios from 'axios';
import type { IUser } from '../user';
import type { PolicyPackage } from '@entity/policy-package';

export async function registerInstallerInUiService({
  installer,
  installerOptions,
  policyId,
  policyPackage,
  uiServiceBaseUrl,
}: {
  policyPackage: PolicyPackage;
  uiServiceBaseUrl: string;
  policyId: string;
  installerOptions: any;
  installer: IUser;
}) {
  const installerSchema = policyPackage.schemas.find(
    (schema) => schema.inputName === 'TymlezInstaller',
  );

  assert(installerSchema, `Cannot find installer schema`);

  await axios.post(
    `${uiServiceBaseUrl}/policy/block/tag2/${policyId}/add_new_installer_request`,
    {
      type: installerSchema.uuid,
      '@context': ['https://localhost/schema'],
      ...installerOptions,
    },
    {
      headers: {
        Authorization: `Api-Key ${installer.accessToken}`,
      },
    },
  );
}
