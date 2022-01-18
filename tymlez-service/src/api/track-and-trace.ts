import assert from 'assert';
import { Request, Response, Router } from 'express';
import { HederaHelper } from 'vc-modules';
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

export const makeTrackAndTraceApi = ({
  vcDocumentLoader,
  vcHelper,
  meterConfigRepository,
  policyPackageRepository,
  mrvReceiverUrl,
  uiServiceBaseUrl,
}: {
  vcDocumentLoader: VCDocumentLoader;
  vcHelper: VCHelper;
  meterConfigRepository: MongoRepository<MeterConfig>;
  policyPackageRepository: MongoRepository<PolicyPackage>;
  mrvReceiverUrl: string;
  uiServiceBaseUrl: string;
}) => {
  const trackAndTraceApi = Router();

  trackAndTraceApi.post(
    '/register-installer',
    async (req: Request, res: Response) => {
      const { username, policyTag, installerOptions } = req.body as {
        policyTag: string | undefined;
        username: InstallerUserName | undefined;
        installerOptions: any;
      };

      assert(username, `username is missing`);
      assert(
        username === 'Installer' || username === 'Installer2',
        `Unexpected username '${username}', expect one of the installers`,
      );
      assert(policyTag, `policyTag is missing`);
      assert(installerOptions, `installerOptions is missing`);

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
            installerOptions,
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
        installerOptions,
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
    const { username, meterId, meterLabel, policyTag } = req.body as {
      username: InstallerUserName | undefined;
      policyTag: string | undefined;
      meterId: string | undefined;
      meterLabel: string | undefined;
    };
    policyTag;

    assert(username, `username is missing`);
    assert(
      username === 'Installer' || username === 'Installer2',
      `Unexpected username '${username}', expect one of the installers`,
    );
    assert(policyTag, `policyTag is missing`);
    assert(meterId, `meterId is missing`);

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
      meterId,
      meterLabel,
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

  trackAndTraceApi.post(
    '/generate-mrv',
    async (req: Request, res: Response) => {
      const {
        setting,
        meterId,
        policyTag: inputPolicyTag,
      } = req.body as {
        setting: Record<string, any> | undefined;
        policyTag: string | undefined;
        meterId: string | undefined;
      };

      assert(setting, `setting is missing`);
      assert(meterId, `meterId is missing`);
      assert(inputPolicyTag, `inputPolicyTag is missing`);

      const meterConfigKey = `${inputPolicyTag}-${meterId}`;
      const meterConfig = await meterConfigRepository.findOne({
        where: { key: meterConfigKey },
      });

      if (!meterConfig) {
        res.status(404).send(`Cannot find meter config for ${meterId}`);
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
        const date = new Date().toISOString();
        const vcSubject: any = {};
        if (setting) {
          const keys = Object.keys(setting);
          for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            const value = setting[key];
            vcSubject[key] = String(value);
          }
        }
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
        console.error('end post');
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

      res.status(200).json(document);
    },
  );

  return trackAndTraceApi;
};
