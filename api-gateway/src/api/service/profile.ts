import { Guardians } from '@helpers/guardians';
import { Users } from '@helpers/users';
import { DidDocumentStatus, SchemaEntity, TaskAction, TopicType, UserRole } from '@guardian/interfaces';
import { IAuthUser, Logger, RunFunctionAsync } from '@guardian/common';
import { TaskManager } from '@helpers/task-manager';
import { ServiceError } from '@helpers/service-requests-base';
import { Controller, Get, HttpCode, HttpException, HttpStatus, Put, Req, Response } from '@nestjs/common';
import { AuthUser, checkPermission } from '@auth/authorization-helper';
import { ApiTags } from '@nestjs/swagger';
import { Auth } from '@auth/auth.decorator';

@Controller('profiles')
@ApiTags('profiles')
export class ProfileApi {
  @Get('/:username/')
  @Auth(
      UserRole.STANDARD_REGISTRY,
      UserRole.USER,
      UserRole.AUDITOR
  )
  @HttpCode(HttpStatus.OK)
  async getProfile(@AuthUser() user): Promise<any> {
    const guardians = new Guardians();

    try {
      let didDocument: any = null;
      if (user.did) {
        const didDocuments = await guardians.getDidDocuments({did: user.did});
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

      return {
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
    } catch (error) {
      new Logger().error(error, ['API_GATEWAY']);
      throw new HttpException(error.message, HttpStatus.UNPROCESSABLE_ENTITY);
    }
  }

  @Put('/:username')
  @HttpCode(HttpStatus.NO_CONTENT)
  async setUserProfile(@Req() req, @Response() res): Promise<any> {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
    const users = new Users();
    const guardians = new Guardians();
    let user;
    try {
      user = await users.getUserByToken(token) as IAuthUser;
    } catch (e) {
      user = null;
    }

    if (!user) {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }
    try {

      const profile: any = req.body;
      const username: string = user.username;

      await guardians.createUserProfileCommon(username, profile);

      return res.status(204).send();
    } catch (error) {
      new Logger().error(error, ['API_GATEWAY']);
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Put('/push/:username')
  @HttpCode(HttpStatus.ACCEPTED)
  async setUserProfileAsync(@Req() req, @Response() res): Promise<any> {
    const taskManager = new TaskManager();
    const task = taskManager.start(TaskAction.CONNECT_USER, req.user.id);

    const profile: any = req.body;
    const username: string = req.user.username;
    RunFunctionAsync<ServiceError>(async () => {
      const guardians = new Guardians();
      await guardians.createUserProfileCommonAsync(username, profile, task);
    }, async (error) => {
      new Logger().error(error, ['API_GATEWAY']);
      taskManager.addError(task.taskId, {code: error.code || 500, message: error.message});
    });

    return res.status(202).send(task);
  }

  @Put('/restore/:username')
  @HttpCode(HttpStatus.ACCEPTED)
  async resoreUserProfile(@Req() req, @Response() res): Promise<any> {
    await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
    const taskManager = new TaskManager();
    const task = taskManager.start(TaskAction.RESTORE_USER_PROFILE, req.user.id);

    const profile: any = req.body;
    const username: string = req.user.username;
    RunFunctionAsync<ServiceError>(async () => {
      const guardians = new Guardians();
      await guardians.restoreUserProfileCommonAsync(username, profile, task);
    }, async (error) => {
      new Logger().error(error, ['API_GATEWAY']);
      taskManager.addError(task.taskId, {code: error.code || 500, message: error.message});
    })

    return res.status(202).send(task);
  }

  @Put('/restore/topics/:username')
  @HttpCode(HttpStatus.ACCEPTED)
  async restoreTopic(@Req() req, @Response() res): Promise<any> {
    await checkPermission(UserRole.STANDARD_REGISTRY)(req.user);
    const taskManager = new TaskManager();
    const task = taskManager.start(TaskAction.GET_USER_TOPICS, req.user.id);

    const profile: any = req.body;
    const username: string = req.user.username;
    RunFunctionAsync<ServiceError>(async () => {
      const guardians = new Guardians();
      await guardians.getAllUserTopicsAsync(username, profile, task);
    }, async (error) => {
      new Logger().error(error, ['API_GATEWAY']);
      taskManager.addError(task.taskId, {code: error.code || 500, message: error.message});
    })

    return res.status(202).send(task);
  }

  @Get('/:username/balance')
  @HttpCode(HttpStatus.OK)
  async getUserBalance(@Req() req, @Response() res): Promise<any> {
    if (!req.headers.authorization || !req.user) {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED)
    }
    try {
      const guardians = new Guardians();
      const balance = await guardians.getUserBalance(req.params.username);
      if (!req.user.did) {
        return res.json(null);
      }
      if (isNaN(parseFloat(balance))) {
        throw new HttpException(balance, HttpStatus.UNPROCESSABLE_ENTITY)
      }
      return res.json(balance);
    } catch (error) {
      new Logger().error(error, ['API_GATEWAY']);
      throw error;
    }
  }
}
