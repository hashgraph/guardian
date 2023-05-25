import { Response, Router, NextFunction } from 'express';
import { AuthenticatedRequest, Logger } from '@guardian/common';
import { Guardians } from '@helpers/guardians';
import { Controller, Get } from '@nestjs/common';

@Controller('map')
export class MapApi {
    @Get('/key')
    async getKey() {
        const guardians = new Guardians();
        return await guardians.getMapApiKey();
    }
}

/**
 * Map route
 */
// export const mapAPI = Router();

// mapAPI.get(
//     '/key',
//     async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
//         try {
//             const guardians = new Guardians();
//             res.send(await guardians.getMapApiKey());
//         } catch (error) {
//           new Logger().error(error, ['API_GATEWAY']);
//           return next(error);
//         }
//     }
// );
