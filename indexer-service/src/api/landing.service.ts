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
                    'date',
                ],
            }
        );
        return new MessageResponse<IAnalytics[]>(stats.reverse());
    }

    @MessagePattern(IndexerMessageAPI.GET_PROJECTS_COORDINATES)
    async getProjects(): Promise<AnyResponse<any>> {
        const em = DataBaseHelper.getEntityManager();
        return new MessageResponse<IProjectCoordinates[]>(
            await em.findAll(ProjectCoordinates)
        );
    }
}
