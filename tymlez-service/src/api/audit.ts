import { Request, Response, Router } from 'express';
import type { IFastMqChannel } from 'fastmq';
import { MessageAPI } from 'interfaces';
import { take, takeRight } from 'lodash';

export const makeAuditApi = (channel: IFastMqChannel) => {
  const auditApi = Router();

  auditApi.get('/get-vp-documents', async (req: Request, res: Response) => {
    const filter: IFilter | null = null;

    const vp = (
      await channel.request('guardian.*', MessageAPI.GET_VP_DOCUMENTS, filter)
    ).payload;

    res.status(200).json(vp);
  });

  return auditApi;
};

interface IFilter {
  id: string; //  filter by id
  type: string; // filter by type
  owner: string; // filter by owner
  issuer: string; // filter by issuer
  hash: string; // filter by hash
  policyId: string; // filter by policy id
}
