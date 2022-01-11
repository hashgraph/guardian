import { Request, Response, Router } from 'express';
import { HederaHelper } from 'vc-modules';
import axios from 'axios';
import type { VCDocumentLoader } from '../document-loader/vc-document-loader';
import type { VCHelper } from 'vc-modules';
import type { MongoRepository } from 'typeorm/repository/MongoRepository';
import type { IMeterConfig, MeterConfig } from '@entity/meter-config';
import { omit } from 'lodash';

export const makeMrvApi = ({
  vcDocumentLoader,
  vcHelper,
  meterConfigRepository,
  mrvReceiverUrl,
}: {
  vcDocumentLoader: VCDocumentLoader;
  vcHelper: VCHelper;
  meterConfigRepository: MongoRepository<MeterConfig>;
  mrvReceiverUrl: string;
}) => {
  const mrvApi = Router();

  mrvApi.get('/list-configs', async (req: Request, res: Response) => {
    const meterConfigs = await meterConfigRepository.find();
    if (!meterConfigs) {
      res.send(null);
      return;
    }

    res.status(200).json(meterConfigs);
  });

  mrvApi.get('/get-config/:did', async (req: Request, res: Response) => {
    const did = req.params.did;

    const meterConfig = await meterConfigRepository.findOne({
      where: { did: { $eq: did } },
    });

    if (!meterConfig) {
      res.status(404).send(`Cannot find config for ${did}`);
      return;
    }

    res.status(200).json(meterConfig);
  });

  mrvApi.post('/set-config', async (req: Request, res: Response) => {
    const config: IMeterConfig = req.body;

    try {
      const meterConfig = await setMeterConfig(meterConfigRepository, config);

      res.status(200).json(meterConfig);
    } catch (err) {
      console.error('Failed to add config', err);
      res.status(500).json({ message: 'Failed to add config' });
    }
  });

  mrvApi.post('/generate/:did', async (req: Request, res: Response) => {
    const setting = req.body;
    const did = req.params.did;

    const meterConfig = await meterConfigRepository.findOne({
      where: { did: { $eq: did } },
    });

    if (!meterConfig) {
      res.status(404).send(`Cannot find config for ${did}`);
      return;
    }

    const {
      topic,
      hederaAccountId,
      hederaAccountKey,
      installer,
      key,
      policyId,
      type,
      schema,
      policyTag,
    } = meterConfig;

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

async function setMeterConfig(
  meterConfigRepository: MongoRepository<MeterConfig>,
  config: IMeterConfig,
): Promise<MeterConfig> {
  const existingMeterConfig = await meterConfigRepository.findOne({
    where: { did: { $eq: config.did } },
  });

  if (!existingMeterConfig) {
    const newMeterConfig = meterConfigRepository.create(config as MeterConfig);
    return await meterConfigRepository.save(newMeterConfig);
  }

  const updatedMeterConfig = meterConfigRepository.create({
    ...omit(existingMeterConfig, 'id'),
    ...config,
    updateDate: new Date(),
  });

  await meterConfigRepository.replaceOne(
    { _id: existingMeterConfig.id },
    updatedMeterConfig,
  );

  return { ...updatedMeterConfig, id: existingMeterConfig.id };
}
