import { Guardians } from '@helpers/guardians';
import { Response, Router, NextFunction } from 'express';
import { UserRole} from '@guardian/interfaces';
import { permissionHelper } from '@auth/authorization-helper';
import { AuthenticatedRequest, Logger } from '@guardian/common';
import validate from '@middlewares/validation';
import { importSchema, retireRequestSchema, retireSchema } from '@middlewares/validation/schemas/contracts';

/**
 * Contract route
 */
export const contractAPI = Router();

contractAPI.get('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    const guardians = new Guardians();
    const [contracts, count] = await guardians.getContracts(
      user.parent || user.did,
      req.query.pageIndex as any,
      req.query.pageSize as any
    );
    return res.setHeader('X-Total-Count', count).json(contracts);
  } catch (error) {
    new Logger().error(error, ['API_GATEWAY']);
    return next(error)
  }
});

contractAPI.post(
  '/',
  permissionHelper(UserRole.STANDARD_REGISTRY),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      const {description} = req.body;
      const guardians = new Guardians();
      return res.status(201).json(
        await guardians.createContract(user.did, description)
      );
    } catch (error) {
      new Logger().error(error, ['API_GATEWAY']);
      return next(error)
    }
  }
);

contractAPI.post(
  '/import',
  [validate(importSchema()), permissionHelper(UserRole.STANDARD_REGISTRY)],
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      const {contractId, description} = req.body;
      const guardians = new Guardians();
      return res.json(
        await guardians.importContract(
          user.did,
          contractId,
          description
        )
      );
    } catch (error) {
      new Logger().error(error, ['API_GATEWAY']);
      return next(error)
    }
  }
);

contractAPI.post(
  '/:contractId/user',
  permissionHelper(UserRole.STANDARD_REGISTRY),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      const {userId} = req.body;
      const guardians = new Guardians();
      return res.json(
        await guardians.addUser(user.did, userId, req.params.contractId)
      );
    } catch (error) {
      new Logger().error(error, ['API_GATEWAY']);
      return next(error)
    }
  }
);

contractAPI.post(
  '/:contractId/status',
  permissionHelper(UserRole.STANDARD_REGISTRY),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      const guardians = new Guardians();
      return res.json(
        await guardians.updateStatus(user.did, req.params.contractId)
      );
    } catch (error) {
      new Logger().error(error, ['API_GATEWAY']);
      return next(error)
    }
  }
);

contractAPI.get('/pair', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    const guardians = new Guardians();
    return res.json(
      await guardians.getContractPair(
        user.did,
        user.parent || user.did,
        req.query?.baseTokenId as string,
        req.query?.oppositeTokenId as string
      )
    );
  } catch (error) {
    new Logger().error(error, ['API_GATEWAY']);
    return next(error);
  }
});

contractAPI.post(
  '/:contractId/pair',
  permissionHelper(UserRole.STANDARD_REGISTRY),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      const {
        baseTokenId,
        oppositeTokenId,
        baseTokenCount,
        oppositeTokenCount,
      } = req.body;
      const guardians = new Guardians();
      return res.json(
        await guardians.addContractPair(
          user.did,
          req.params.contractId,
          baseTokenId,
          oppositeTokenId,
          baseTokenCount,
          oppositeTokenCount
        )
      );
    } catch (error) {
      new Logger().error(error, ['API_GATEWAY']);
      return next(error);
    }
  }
);

contractAPI.get(
  '/retire/request',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      const guardians = new Guardians();
      const [requests, count] = await guardians.getRetireRequests(
        user.parent || user.did,
        user.role === UserRole.USER ? user.did : null,
        req.query?.contractId as string,
        req.query?.pageIndex as any,
        req.query?.pageSize as any
      );
      return res.setHeader('X-Total-Count', count).json(requests);
    } catch (error) {
      new Logger().error(error, ['API_GATEWAY']);
      return next(error);
    }
  }
);

contractAPI.post(
  '/:contractId/retire/request', validate(retireRequestSchema()),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      const {
        baseTokenId,
        oppositeTokenId,
        baseTokenCount,
        oppositeTokenCount,
        baseTokenSerials,
        oppositeTokenSerials,
      } = req.body;
      const guardians = new Guardians();
      return res.json(
        await guardians.retireRequest(
          user.did,
          req.params.contractId,
          baseTokenId,
          oppositeTokenId,
          baseTokenCount,
          oppositeTokenCount,
          baseTokenSerials,
          oppositeTokenSerials
        )
      );
    } catch (error) {
      new Logger().error(error, ['API_GATEWAY']);
      return next(error)
    }
  }
);

contractAPI.delete(
  '/retire/request',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      const guardians = new Guardians();
      return res.json(
        await guardians.cancelRetireRequest(
          user.did,
          req.query?.requestId as string
        )
      );
    } catch (error) {
      new Logger().error(error, ['API_GATEWAY']);
      return next(error)
    }
  }
);

contractAPI.post(
  '/retire',
  [validate(retireSchema()), permissionHelper(UserRole.STANDARD_REGISTRY)],
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      const { requestId } = req.body;
      const guardians = new Guardians();
      return res.json(await guardians.retire(user.did, requestId));
    } catch (error) {
      new Logger().error(error, ['API_GATEWAY']);
      return next(error)
    }
  }
);
