import assert from 'assert';
import { Request, Response, Router } from 'express';
import { HederaHelper } from 'vc-modules';
import axios from 'axios';
import type { VCDocumentLoader } from '../document-loader/vc-document-loader';
import type { VCHelper } from 'vc-modules';
import type { MongoRepository } from 'typeorm/repository/MongoRepository';
import type { MeterConfig } from '@entity/meter-config';
import { InstallerUserName, loginToUiService, UserName } from '../modules/user';
import type { PolicyPackage } from '@entity/policy-package';
import {
  addMeterToUiService,
  getMeterConfigFromUiService,
  getMetersFromUiService,
  getNewMeters,
} from '../modules/meter';

export const makeMrvApi = ({
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
  const mrvApi = Router();

  mrvApi.get('/list-meters', async (req: Request, res: Response) => {
    const meterConfigs = await meterConfigRepository.find();
    if (!meterConfigs) {
      res.send(null);
      return;
    }

    res.status(200).json(meterConfigs);
  });

  mrvApi.post('/add-meter', async (req: Request, res: Response) => {
    const { username, meterId, policyId } = req.body as {
      policyId: string;
      username: InstallerUserName | undefined;
      meterId: string;
    };

    assert(username, `username is missing`);
    assert(
      username === 'Installer' || username === 'Installer2',
      `Unexpected username '${username}', expect one of the installers`,
    );
    assert(policyId, `policyId is missing`);
    assert(meterId, `meterId is missing`);

    const existingMeterConfig = await meterConfigRepository.findOne({
      where: { meterId: { $eq: meterId } },
    });

    if (existingMeterConfig) {
      console.log(`Skip because meter '${meterId}' was added before.`);
      res.status(200).json(existingMeterConfig);
      return;
    }

    const installer = await loginToUiService({
      uiServiceBaseUrl,
      username,
    });

    const policyPackage = await policyPackageRepository.findOne({
      where: {
        'policy.id': policyId,
      },
    });
    assert(policyPackage, `Cannot find ${policyId} package`);

    const preAddMeters = await getMetersFromUiService({
      uiServiceBaseUrl,
      policyId,
      installer,
    });

    await addMeterToUiService({
      policyPackage,
      uiServiceBaseUrl,
      policyId,
      meterId,
      installer,
    });

    const newMeters = await getNewMeters(
      uiServiceBaseUrl,
      policyId,
      installer,
      preAddMeters,
    );

    assert(
      newMeters.length === 1,
      `Number of new meters is ${newMeters.length}, expect 1`,
    );

    console.log(`Getting meter config for ${meterId}`);
    const meterConfig = await getMeterConfigFromUiService({
      uiServiceBaseUrl,
      policyId,
      meter: newMeters[0],
      installer,
    });

    const newMeterConfig = meterConfigRepository.create({
      meterId,
      config: meterConfig,
    } as MeterConfig);
    await meterConfigRepository.save(newMeterConfig);

    res.status(200).json(meterConfig);
  });

  mrvApi.post('/generate/:meterId', async (req: Request, res: Response) => {
    const setting = req.body;
    const meterId = req.params.meterId;

    const meterConfig = await meterConfigRepository.findOne({
      where: { meterId: { $eq: meterId } },
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
          const item = setting[key];
          if (item.random) {
            const _decimal = Math.pow(10, item.decimal + 1);
            vcSubject[key] = String(Math.round(Math.random() * _decimal));
          } else {
            vcSubject[key] = String(item.value);
          }
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
  });

  return mrvApi;
};
