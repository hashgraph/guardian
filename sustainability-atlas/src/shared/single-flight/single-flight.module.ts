import { Global, Module } from '@nestjs/common';
import { SingleFlightService } from './single-flight.service';

/**
 * Global module exposing SingleFlightService, so any service can dedupe
 * concurrent cache-miss recomputes without importing a provider module.
 */
@Global()
@Module({
    providers: [SingleFlightService],
    exports: [SingleFlightService],
})
export class SingleFlightModule {}
