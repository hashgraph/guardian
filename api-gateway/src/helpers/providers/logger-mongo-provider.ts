import { mongoLoggerInitialization } from '@guardian/common';

//constants
import { LOGGER_MONGO_PROVIDER } from '#constants';

export const loggerMongoProvider = {
    provide: LOGGER_MONGO_PROVIDER,
    useFactory: async () => mongoLoggerInitialization()
};