import { mongoForLoggingInitialization } from '@guardian/common/helpers/mongo-logging-initialization';

//constants
import { LOGGER_MONGO_PROVIDER } from '#constants';

export const loggerMongoProvider = {
    provide: LOGGER_MONGO_PROVIDER,
    useFactory: async () => mongoForLoggingInitialization()
};