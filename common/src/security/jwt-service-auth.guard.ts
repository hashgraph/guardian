import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { NatsContext }  from '@nestjs/microservices';
import { JwtServicesValidator } from './jwt-services-validator.js';

@Injectable()
export class JwtServiceAuthGuard implements CanActivate {
  constructor(private readonly allowedCommands: string[]) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    if (ctx.getType() !== 'rpc') {
      return true;
    }

    const rpc = ctx.switchToRpc();
    const nats = rpc.getContext<NatsContext>();
    const subject = nats.getSubject();

    if (!this.allowedCommands.includes(subject)) {
      throw new ForbiddenException(`NATS ACL: "${subject}" not allowed`);
    }

    const rawMsg = ctx.getArgByIndex(1);
    const token = rawMsg?.getHeaders?.()?.get('serviceToken');

    await JwtServicesValidator.verify(token);

    return true;
  }
}
