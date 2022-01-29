import axios from 'axios';
import { IUserProfile, UserState } from 'interfaces';
import type { IUser } from './IUser';
import { getUserProfileFromUiService } from './getUserProfileFromUiService';
import { loginToUiService, UserName } from './loginToUiService';
import { getRandomKeyFromUiService } from '../key';

export async function initInstaller({
  uiServiceBaseUrl,
  username,
}: {
  uiServiceBaseUrl: string;
  username: UserName;
}) {
  const user = await loginToUiService({
    uiServiceBaseUrl,
    username,
  });

  if (user.state < UserState.HEDERA_CONFIRMED) {
    await initInstallerHederaProfile({ uiServiceBaseUrl, user });
  }

  await associateInstallerWithTokens({ uiServiceBaseUrl, user });

  return await getUserProfileFromUiService({ uiServiceBaseUrl, user });
}

async function initInstallerHederaProfile({
  uiServiceBaseUrl,
  user,
}: {
  uiServiceBaseUrl: string;
  user: IUser;
}) {
  const randomKey = await getRandomKeyFromUiService({
    uiServiceBaseUrl,
    user,
  });

  await axios.post(
    `${uiServiceBaseUrl}/api/profile/set-hedera-profile`,
    {
      hederaAccountId: randomKey.id,
      hederaAccountKey: randomKey.key,
    },
    {
      headers: {
        authorization: `Bearer ${user.accessToken}`,
      },
    },
  );

  let userProfile: IUserProfile | undefined;

  while (!userProfile || userProfile.state < UserState.HEDERA_CONFIRMED) {
    console.log('Waiting for user to be initialized', userProfile);

    userProfile = await getUserProfileFromUiService({ uiServiceBaseUrl, user });

    if (userProfile && userProfile.state >= UserState.HEDERA_CONFIRMED) {
      break;
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
}

async function associateInstallerWithTokens({
  uiServiceBaseUrl,
  user,
}: {
  uiServiceBaseUrl: string;
  user: IUser;
}) {
  const { data: userTokens } = (await axios.get(
    `${uiServiceBaseUrl}/api/tokens/user-tokens`,
    {
      headers: {
        authorization: `Bearer ${user.accessToken}`,
      },
    },
  )) as { data: IUserTokenResponse[] };

  await Promise.all(
    userTokens
      .filter((token) => !token.associated)
      .map(async (token) => {
        await axios.post(
          `${uiServiceBaseUrl}/api/tokens/associate`,
          {
            tokenId: token.tokenId,
            associated: true,
          },
          {
            headers: {
              authorization: `Bearer ${user.accessToken}`,
            },
          },
        );
      }),
  );
}

interface IUserTokenResponse {
  id: string;
  associated: boolean;
  tokenId: string;
}
