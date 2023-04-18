import { Guardians } from '@helpers/guardians';
import { Users } from '@helpers/users';
import { Request, Response, Router, NextFunction } from 'express';
import {
  DidDocumentStatus,
  IUser,
  SchemaEntity,
  TopicType, UserRole
} from '@guardian/interfaces';
import { AuthenticatedRequest, Logger, RunFunctionAsync } from '@guardian/common';
import { TaskManager } from '@helpers/task-manager';
import { permissionHelper } from '@auth/authorization-helper';
import { ServiceError } from '@helpers/service-requests-base';
import createError from 'http-errors';

/**
 * User profile route
 */
export const profileAPI = Router();

profileAPI.get('/:username/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const guardians = new Guardians();
    const users = new Users();

    const user = await users.getUser(req.user.username);

    let didDocument: any = null;
    if (user.did) {
      const didDocuments = await guardians.getDidDocuments({ did: user.did });
      if (didDocuments) {
        didDocument = didDocuments[didDocuments.length - 1];
      }
    }

    let vcDocument: any = null;
    if (user.did) {
      let vcDocuments = await guardians.getVcDocuments({
        owner: user.did,
        type: SchemaEntity.USER
      });
      if (vcDocuments && vcDocuments.length) {
        vcDocument = vcDocuments[vcDocuments.length - 1];
      }
      vcDocuments = await guardians.getVcDocuments({
        owner: user.did,
        type: SchemaEntity.STANDARD_REGISTRY
      });
      if (vcDocuments && vcDocuments.length) {
        vcDocument = vcDocuments[vcDocuments.length - 1];
      }
    }

    let topic: any;
    if (user.did || user.parent) {
      const filters = [];
      if (user.did) {
        filters.push(user.did);
      }
      if (user.parent) {
        filters.push(user.parent);
      }
      topic = await guardians.getTopic({
        type: TopicType.UserTopic,
        owner: { $in: filters }
      });
    }

    const result: IUser = {
      username: user.username,
      role: user.role,
      did: user.did,
      parent: user.parent,
      hederaAccountId: user.hederaAccountId,
      confirmed: !!(didDocument && didDocument.status === DidDocumentStatus.CREATE),
      failed: !!(didDocument && didDocument.status === DidDocumentStatus.FAILED),
      hederaAccountKey: null,
      topicId: topic?.topicId,
      parentTopicId: topic?.parent,
      didDocument,
      vcDocument
    };
    return res.json(result);
  } catch (error) {
    new Logger().error(error, ['API_GATEWAY']);
    return next(error);
  }
});

profileAPI.put('/:username', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const guardians = new Guardians();

    const profile: any = req.body;
    const username: string = req.user.username;

    await guardians.createUserProfileCommon(username, profile);

    return res.status(204).send();
  } catch (error) {
    new Logger().error(error, ['API_GATEWAY']);
    return next(error);
  }
});

profileAPI.put('/push/:username', async (req: AuthenticatedRequest, res: Response) => {
  const taskManager = new TaskManager();
  const {taskId, expectation} = taskManager.start('Connect user');

  const profile: any = req.body;
  const username: string = req.user.username;
  RunFunctionAsync<ServiceError>(async () => {
    const guardians = new Guardians();
    await guardians.createUserProfileCommonAsync(username, profile, taskId);
  }, async (error) => {
    new Logger().error(error, ['API_GATEWAY']);
    taskManager.addError(taskId, {code: error.code || 500, message: error.message});
  });

  return res.status(202).send({taskId, expectation});
});

profileAPI.put('/restore/:username', permissionHelper(UserRole.STANDARD_REGISTRY), async (req: AuthenticatedRequest, res: Response) => {
  const taskManager = new TaskManager();
  const {taskId, expectation} = taskManager.start('Restore user profile');

  const profile: any = req.body;
  const username: string = req.user.username;

  RunFunctionAsync<ServiceError>(async () => {
    const guardians = new Guardians();
    await guardians.restoreUserProfileCommonAsync(username, profile, taskId);
  }, async (error) => {
    new Logger().error(error, ['API_GATEWAY']);
    taskManager.addError(taskId, {code: error.code || 500, message: error.message});
  })

  return res.status(202).send({taskId, expectation});
});

profileAPI.put('/restore/topics/:username', permissionHelper(UserRole.STANDARD_REGISTRY), async (req: AuthenticatedRequest, res: Response) => {
  const taskManager = new TaskManager();
  const {taskId, expectation} = taskManager.start('Get user topics');

  const profile: any = req.body;
  const username: string = req.user.username;

  RunFunctionAsync<ServiceError>(async () => {
    const guardians = new Guardians();
    await guardians.getAllUserTopicsAsync(username, profile, taskId);
  }, async (error) => {
    new Logger().error(error, ['API_GATEWAY']);
    taskManager.addError(taskId, {code: error.code || 500, message: error.message});
  })

  return res.status(202).send({taskId, expectation});
});

profileAPI.get('/:username/balance', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const guardians = new Guardians();
    const balance = await guardians.getUserBalance(req.params.username);
    if (balance.toLowerCase().includes('invalid account')) {
      return next(createError(404, 'Account not found'));
    }
    return res.json(balance);
  } catch (error) {
    new Logger().error(error, ['API_GATEWAY']);
    return next(error);
  }
});
