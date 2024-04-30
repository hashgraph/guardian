import { NextFunction, Response } from 'express';
import { Users } from '../helpers/users.js';
import { AuthenticatedRequest, IAuthUser, Logger } from '@guardian/common';
import { createParamDecorator, ExecutionContext, HttpException, HttpStatus, Injectable, NestMiddleware } from '@nestjs/common';
import { ServerResponse, IncomingMessage } from 'http';

import { FastifyRequest, FastifyReply } from 'fastify';

export const AuthUser = createParamDecorator((data: string = 'user', ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest();
    return req.user
})

/**
 * Permission middleware
 */
@Injectable()
export class PermissionMiddleware implements NestMiddleware {

    /**
     * Permission middleware
     * @param req
     * @param res
     * @param next
     */
    use(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        next();
    }
}

/**
 * Authorization middleware
 * @param req
 * @param res
 * @param next
 */
export async function authorizationHelper(req: AuthenticatedRequest, res: Response, next: Function): Promise<void> {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        next();
        return;
    }
    const users = new Users();
    const token = authHeader.split(' ')[1];
    if (authHeader) {
        try {
            req.user = await users.getUserByToken(token) as IAuthUser;
            next();
            return;
        } catch (error) {
            new Logger().warn(error.message, ['API_GATEWAY']);
        }
    }
    throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED)
}

/**
 * Calculate user permissions
 * @param roles
 */
export function checkPermission(...roles: string[]) {
    return async (user: IAuthUser): Promise<void> => {
        if (user) {
            if(user.role) {
                if(roles.indexOf(user.role) !== -1) {
                    return;
                }
            }
            throw new HttpException('Forbidden', HttpStatus.FORBIDDEN)
        } else {
            throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED)
        }
    }
}

/**
 * Calculate user permissions
 * @param roles
 */
export function permissionHelper(...roles: string[]) {
    return async (req: AuthenticatedRequest, res: Response, next: Function): Promise<void> => {
        if (req.user) {
            if(req.user.role) {
                if(roles.indexOf(req.user.role) !== -1) {
                    next();
                    return;
                }
            }
            throw new HttpException('Forbidden', HttpStatus.FORBIDDEN)
        } else {
            throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
        }
    }
}

/**
 */
export async function nextHelper(req: AuthenticatedRequest, res: Response, next: Function): Promise<void> {
  console.log("nextHelper");
  next();
}

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  use(req: FastifyRequest['raw'], res: FastifyReply['raw'], next: () => void) {
    console.log('Request...');
    next();
  }
}

@Injectable()
export class AppMiddleware implements NestMiddleware {
  async use(req: any, res: any, next: Function) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      next();
      return;
    }
    const users = new Users();
    const token = authHeader.split(' ')[1];
    if (authHeader) {
      try {
        req.user = await users.getUserByToken(token) as IAuthUser;
        next();
        return;
      } catch (error) {
        await new Logger().warn(error.message, ['API_GATEWAY']);
      }
    }
    throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED)
  }
}

const RAW_REQUEST_LIMIT = process.env.RAW_REQUEST_LIMIT || '1gb';

