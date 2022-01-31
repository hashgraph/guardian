import axios from 'axios';
import { Request, Response, Router } from 'express';

export const makeInfoApi = ({
  uiServiceBaseUrl,
  guardianServiceBaseUrl,
  messageBrokerBaseUrl,
}: {
  uiServiceBaseUrl: string;
  guardianServiceBaseUrl: string;
  messageBrokerBaseUrl: string;
}) => {
  const infoApi = Router();

  infoApi.get('/', async (req: Request, res: Response) => {
    res.status(200).json({
      NAME: 'tymlez-service',
      BUILD_VERSION: process.env.BUILD_VERSION,
      DEPLOY_VERSION: process.env.DEPLOY_VERSION,
      OPERATOR_ID: process.env.OPERATOR_ID,
    });
  });

  infoApi.get('/all', async (req: Request, res: Response) => {
    res.status(200).json({
      NAME: 'tymlez-service',
      BUILD_VERSION: process.env.BUILD_VERSION,
      DEPLOY_VERSION: process.env.DEPLOY_VERSION,
      OPERATOR_ID: process.env.OPERATOR_ID,

      uiServiceInfo: await getServiceInfo({
        baseUrl: `${uiServiceBaseUrl}/api`,
        serviceName: 'UI Service',
      }),
      guardianServiceInfo: await getServiceInfo({
        baseUrl: guardianServiceBaseUrl,
        serviceName: 'Guardian Service',
      }),
      messageBrokerInfo: await getServiceInfo({
        baseUrl: messageBrokerBaseUrl,
        serviceName: 'Message Broker',
      }),
    });
  });

  return infoApi;
};

async function getServiceInfo({
  baseUrl,
  serviceName,
}: {
  baseUrl: string;
  serviceName: string;
}) {
  try {
    const { data: serviceInfo } = await axios.get(`${baseUrl}/info`);
    return serviceInfo;
  } catch (ex) {
    console.warn(`Failed to get info from ${serviceName} ${baseUrl}`);
    return undefined;
  }
}
