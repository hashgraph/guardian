import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';

import { Observable, tap } from 'rxjs';
import { performance } from 'node:perf_hooks';

@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const start: number = performance.now();

    const request = context.switchToHttp().getRequest();
    const route = request?.url;

    return next.handle().pipe(
      tap(() => {
        const end: number = performance.now();
        const executionTime: number = end - start;
        console.log(`Execution time for ${route}: ${executionTime.toFixed(2)}ms`);
      }),
    );
  }
}
