import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';

import { Observable, tap } from 'rxjs';

@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        const end = Date.now();
        const executionTime = end - start;
        console.log(`Execution time for ${context.getHandler().name}: ${executionTime}ms`);
      }),
    );
  }
}
