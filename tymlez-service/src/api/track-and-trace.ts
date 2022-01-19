import assert from 'assert';
import { Request, Response, Router } from 'express';
import { HederaHelper } from 'vc-modules';
import Joi from 'joi';
import axios from 'axios';
import type { VCDocumentLoader } from '../document-loader/vc-document-loader';
import type { VCHelper } from 'vc-modules';
import type { MongoRepository } from 'typeorm/repository/MongoRepository';
import type { MeterConfig } from '@entity/meter-config';
import { InstallerUserName, loginToUiService } from '../modules/user';
import type { PolicyPackage } from '@entity/policy-package';
import {
  addMeterToUiService,
  getMeterConfigFromUiService,
  getMetersFromUiService,
  getNewMeters,
  registerInstallerInUiService,
} from '../modules/track-and-trace';
import type { ProcessedMrv } from '@entity/processed-mrv';
import { mrvSettingSchema } from '../modules/track-and-trace/mrvSettingSchema';
import type { IMrvSetting } from '../modules/track-and-trace/IMrvSetting';
import type { IIsoDate } from '@entity/IIsoDate';

export const makeTrackAndTraceApi = ({
  vcDocumentLoader,
  vcHelper,
  meterConfigRepository,
  policyPackageRepository,
  processedMrvRepository,
  mrvReceiverUrl,
  uiServiceBaseUrl,
}: {
  vcDocumentLoader: VCDocumentLoader;
  vcHelper: VCHelper;
  meterConfigRepository: MongoRepository<MeterConfig>;
  policyPackageRepository: MongoRepository<PolicyPackage>;
  processedMrvRepository: MongoRepository<ProcessedMrv>;
  mrvReceiverUrl: string;
  uiServiceBaseUrl: string;
}) => {
  const trackAndTraceApi = Router();

  trackAndTraceApi.post(
    '/register-installer',
    async (req: Request, res: Response) => {
      const { username, policyTag, installerInfo } = req.body as {
        policyTag: string | undefined;
        username: InstallerUserName | undefined;
        installerInfo: any;
      };

      assert(username, `username is missing`);
      assert(
        username === 'Installer' || username === 'Installer2',
        `Unexpected username '${username}', expect one of the installers`,
      );
      assert(policyTag, `policyTag is missing`);
      assert(installerInfo, `installerInfo is missing`);

      const installer = await loginToUiService({
        uiServiceBaseUrl,
        username,
      });

      const policyPackage = await policyPackageRepository.findOne({
        where: { 'policy.inputPolicyTag': policyTag },
      });
      assert(policyPackage, `Cannot find ${policyTag} package`);

      const { data: installerBlock } = await axios.get(
        `${uiServiceBaseUrl}/policy/block/tag2/${policyPackage.policy.id}/init_installer_steps`,
        {
          headers: {
            Authorization: `Api-Key ${installer.accessToken}`,
          },
        },
      );

      assert(
        installerBlock.blockType === 'interfaceStepBlock',
        `installerBlock.blockType is ${installerBlock.blockType}, expect interfaceStepBlock`,
      );

      if (
        installerBlock.blocks[installerBlock.index].blockType !==
        'requestVcDocument'
      ) {
        console.log(
          `Skip because installer '${JSON.stringify(
            installerInfo,
          )}' was registered before.`,
          installerBlock,
        );
        res.status(200).json({});
        return;
      }

      await registerInstallerInUiService({
        policyPackage,
        uiServiceBaseUrl,
        policyId: policyPackage.policy.id,
        installerInfo,
        installer,
      });

      res.status(200).json({});
    },
  );

  trackAndTraceApi.get(
    '/list-meters/:policyTag',
    async (req: Request, res: Response) => {
      const { policyTag } = req.params as { policyTag: string | undefined };
      assert(policyTag, `policyTag is missing`);

      const meterConfigs = await meterConfigRepository.find({
        where: { policyTag: req.params.policyTag },
      });
      if (!meterConfigs) {
        res.send(null);
        return;
      }

      res.status(200).json(meterConfigs);
    },
  );

  trackAndTraceApi.post('/add-meter', async (req: Request, res: Response) => {
    const { username, meterId, meterInfo, policyTag } = req.body as {
      username: InstallerUserName | undefined;
      policyTag: string | undefined;
      meterId: string | undefined;
      meterInfo: any;
    };

    assert(username, `username is missing`);
    assert(
      username === 'Installer' || username === 'Installer2',
      `Unexpected username '${username}', expect one of the installers`,
    );
    assert(policyTag, `policyTag is missing`);
    assert(meterId, `meterId is missing`);
    assert(meterInfo, `meterInfo is missing`);

    const meterConfigKey = `${policyTag}-${meterId}`;

    const existingMeterConfig = await meterConfigRepository.findOne({
      where: { key: meterConfigKey },
    });

    if (existingMeterConfig) {
      console.log(
        `Skip because meter '${meterId}' with policy '${policyTag}' was added before.`,
      );
      res.status(200).json(existingMeterConfig);
      return;
    }

    const installer = await loginToUiService({
      uiServiceBaseUrl,
      username,
    });

    const policyPackage = await policyPackageRepository.findOne({
      where: { 'policy.inputPolicyTag': policyTag },
    });
    assert(policyPackage, `Cannot find ${policyTag} package`);

    const preAddMeters = await getMetersFromUiService({
      uiServiceBaseUrl,
      policyId: policyPackage.policy.id,
      installer,
    });

    await addMeterToUiService({
      policyPackage,
      uiServiceBaseUrl,
      policyId: policyPackage.policy.id,
      meterInfo,
      installer,
    });

    const newMeters = await getNewMeters({
      uiServiceBaseUrl,
      policyId: policyPackage.policy.id,
      installer,
      preAddMeters,
    });

    assert(
      newMeters.length === 1,
      `Number of new meters is ${newMeters.length}, expect 1`,
    );

    console.log(`Getting meter config for ${meterId} with policy ${policyTag}`);
    const meterConfig = await getMeterConfigFromUiService({
      uiServiceBaseUrl,
      policyId: policyPackage.policy.id,
      meter: newMeters[0],
      installer,
    });

    const newMeterConfig = meterConfigRepository.create({
      key: meterConfigKey,
      meterId,
      policyTag,
      config: meterConfig,
    } as MeterConfig);
    await meterConfigRepository.save(newMeterConfig);

    res.status(200).json(meterConfig);
  });

  trackAndTraceApi.get(
    '/latest-mrv/:policyTag/:meterId',
    async (req: Request, res: Response) => {
      const { meterId, policyTag } = req.params as {
        policyTag: string | undefined;
        meterId: string | undefined;
      };

      const mrv = await processedMrvRepository.findOne({
        where: { policyTag, meterId },
        order: { timestamp: 'DESC' },
      });

      if (mrv) {
        res.status(200).json(mrv);
        return;
      }

      res
        .status(404)
        .send(`Cannot find latest MRV for ${policyTag}-${meterId}`);
    },
  );

  trackAndTraceApi.post(
    '/generate-mrv',
    async (req: Request, res: Response) => {
      const {
        setting,
        meterId,
        policyTag: inputPolicyTag,
      } = await getGenerateMrvRequest(req.body);

      const meterConfigKey = `${inputPolicyTag}-${meterId}`;
      const meterConfig = await meterConfigRepository.findOne({
        where: { key: meterConfigKey },
      });

      if (!meterConfig) {
        res.status(404).send(`Cannot find meter config for ${meterId}`);
        return;
      }

      const mrvKey = `${inputPolicyTag}-${meterId}-${setting.mrvTimestamp}`;
      const processedMrv = await processedMrvRepository.findOne({
        where: { key: mrvKey },
      });

      if (processedMrv) {
        console.log(`Skip because MRV ${mrvKey} already processed`);
        res.status(200).json({
          exists: true,
        });
        return;
      }

      const {
        topic,
        hederaAccountId,
        hederaAccountKey,
        installer,
        did,
        key,
        policyId,
        type,
        schema,
        policyTag,
      } = meterConfig.config;

      vcDocumentLoader.setDocument(schema);

      const hederaHelper = HederaHelper.setOperator(
        hederaAccountId,
        hederaAccountKey,
      ).setAddressBook(null as any, null as any, topic);

      let document, vc;
      try {
        const vcSubject: any = { ...setting };
        vcSubject.policyId = policyId;
        vcSubject.accountId = hederaAccountId;

        vc = await vcHelper.createVC(did, key, type, vcSubject);
        document = vc.toJsonTree();

        console.log('created vc');
        console.log(document);
      } catch (e) {
        console.error(e);
        res.status(500).json(e);
        return;
      }

      const body = {
        document: document,
        owner: installer,
        policyTag: policyTag,
      };
      try {
        console.error('start post');
        const resp = await axios.post(mrvReceiverUrl, body);
        console.error('end post', resp);
      } catch (e) {
        console.error(e);
        res.status(500).json(e);
        return;
      }

      try {
        console.error('start Transaction', JSON.stringify(vc, undefined, 2));
        await hederaHelper.DID.createVcTransaction(vc, hederaAccountKey);
        console.error('end Transaction');
      } catch (e) {
        console.error(e);
        res.status(500).json(e);
        return;
      }

      await saveProcessedMrv({
        processedMrvRepository,
        meterId,
        policyTag: inputPolicyTag,
        timestamp: setting.mrvTimestamp,
      });

      res.status(200).json(document);
    },
  );

  return trackAndTraceApi;
};

async function saveProcessedMrv({
  processedMrvRepository,
  policyTag,
  meterId,
  timestamp,
}: {
  processedMrvRepository: MongoRepository<ProcessedMrv>;
  policyTag: string;
  meterId: string | undefined;
  timestamp: IIsoDate;
}) {
  const mrvKey = `${policyTag}-${meterId}-${timestamp}`;

  const processedMrv = processedMrvRepository.create({
    key: mrvKey,
    meterId,
    policyTag,
    timestamp,
  });

  await processedMrvRepository.save(processedMrv);
}

async function getGenerateMrvRequest(input: any) {
  await generateMrvRequestSchema.validateAsync(input, {
    abortEarly: false,
    allowUnknown: true,
  });

  return input as IGenerateMrvRequest;
}

interface IGenerateMrvRequest {
  setting: IMrvSetting;
  policyTag: string;
  meterId: string;
}

const generateMrvRequestSchema = Joi.object<IGenerateMrvRequest>({
  policyTag: Joi.string().required(),
  meterId: Joi.string().required(),
  setting: mrvSettingSchema,
});
