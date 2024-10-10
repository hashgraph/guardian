import { ProjectCoordinates } from '@indexer/interfaces';
import { ApiProperty } from '@nestjs/swagger';

export class ProjectCoordinatesDTO implements ProjectCoordinates {
    @ApiProperty({
        description: 'Coordinates of project',
        example: '33.33|77.77',
    })
    coordinates: string;

    @ApiProperty({
        description: 'Project message identifier',
        example: '1706823227.586179534',
    })
    projectId: string;
}
