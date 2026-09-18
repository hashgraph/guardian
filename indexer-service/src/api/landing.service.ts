import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import {
    IndexerMessageAPI,
    MessageResponse,
    AnyResponse,
    DataBaseHelper,
    ProjectCoordinates,
    Analytics,
} from '@indexer/common';
import {
    LandingAnalytics as IAnalytics,
    ProjectCoordinates as IProjectCoordinates,
} from '@indexer/interfaces';

@Controller()
export class LandingService {
    @MessagePattern(IndexerMessageAPI.GET_LANDING_ANALYTICS)
    async getAnalytics(): Promise<AnyResponse<any>> {
        const em = DataBaseHelper.getEntityManager();
        const stats = await em.find(
            Analytics,
            {},
            {
                orderBy: {
                    date: -1,
                },
                limit: 10,
                fields: [
                    'registries',
                    'methodologies',
                    'projects',
                    'totalIssuance',
                    'totalSerialized',
                    'totalFungible',
                    'date',
                ],
            }
        );
        return new MessageResponse<IAnalytics[]>(stats.reverse());
    }

    @MessagePattern(IndexerMessageAPI.GET_PROJECTS_COORDINATES)
    async getProjects(): Promise<AnyResponse<IProjectCoordinates[]>> {
        const em = DataBaseHelper.getEntityManager();
        const coordinates: IProjectCoordinates[] = (await em.find(
            ProjectCoordinates,
            {}
        )) as any;
        return new MessageResponse<IProjectCoordinates[]>(coordinates);
    }
}
