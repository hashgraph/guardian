import axios from 'axios';
import { IUserProfile, UserState } from 'interfaces';
import { getRandomKeyFromUiService } from '../key';
import type { IUser } from './IUser';
import { getUserProfileFromUiService } from './getUserProfileFromUiService';

export async function initRootAuthority(
  rootAuthority: IUser,
  uiServiceBaseUrl: string,
) {
  if (rootAuthority.state >= UserState.CONFIRMED) {
    console.log('Skip because root config already initialized');
    return;
  }

  await initRootConfig({ uiServiceBaseUrl, rootAuthority });
}

async function initRootConfig({
  uiServiceBaseUrl,
  rootAuthority,
}: {
  uiServiceBaseUrl: string;
  rootAuthority: IUser;
}) {
  const randomKey = await getRandomKeyFromUiService({
    uiServiceBaseUrl,
    user: rootAuthority,
  });

  await axios.post(
    `${uiServiceBaseUrl}/api/set-root-config`,
    {
      vc: {
        name: 'Tymlez',
        type: 'RootAuthority',
        '@context': ['https://localhost/schema'],
      },
      hederaAccountId: randomKey.id,
      hederaAccountKey: randomKey.key,
      appnetName: 'Test Identity SDK appnet',
      didServerUrl: 'http://localhost:3000/api/v1',
      didTopicMemo: 'Test Identity SDK appnet DID topic',
      vcTopicMemo: 'Test Identity SDK appnet VC topic',
    },
    {
      headers: {
        authorization: `Bearer ${rootAuthority.accessToken}`,
      },
    },
  );

  let userProfile: IUserProfile | undefined;

  while (!userProfile || userProfile.state < UserState.CONFIRMED) {
    console.log('Waiting for user to be initialized', userProfile);

    userProfile = await getUserProfileFromUiService({
      uiServiceBaseUrl,
      user: rootAuthority,
    });

    if (userProfile && userProfile.state >= UserState.CONFIRMED) {
      break;
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
}
