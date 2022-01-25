import { Request, Response, Router } from 'express';
import type { IFastMqChannel } from 'fastmq';
import { MessageAPI } from 'interfaces';
import { take, takeRight } from 'lodash';
import type { MongoRepository } from 'typeorm/repository/MongoRepository';
import type { MeterConfig } from '@entity/meter-config';

export const makeAuditApi = (
  channel: IFastMqChannel,
  meterConfigRepository: MongoRepository<MeterConfig>,
) => {
  const auditApi = Router();

  auditApi.get(
    '/get-vp-documents/:meterId',
    async (req: Request, res: Response) => {
      const { meterId } = req.params as {
        meterId: string | undefined;
      };

      const { page, pageSize, period} = req.query as {
        page: number | undefined;
        pageSize: number | undefined;
        period: number | undefined
      };

      const meter = await meterConfigRepository.findOne({
        where: { meterId },
      });

      let filter: IFilter | null = null;

      if (meter) {
        filter = { issuer: meter.config.did, page, pageSize, period };
        const vp = (
          await channel.request(
            'guardian.*',
            MessageAPI.FIND_VP_DOCUMENTS,
            filter,
          )
        ).payload;

        res.status(200).json(vp);
        return;
      }

      res.status(404).send(`Cannot find VP documents for meterId: ${meterId}`);
    },
  );

  return auditApi;
};

interface IFilter {
  id?: string; //  filter by id
  type?: string; // filter by type
  owner?: string; // filter by owner
  issuer?: string; // filter by issuer
  hash?: string; // filter by hash
  policyId?: string; // filter by policy id
  pageSize?: number;
  page?: number;
  period?: number;
}
