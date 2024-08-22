import { ApiProperty } from "@nestjs/swagger";

export class UpdateFileDTO {
    @ApiProperty({
        description: 'Entity Timestamp',
        example: '1706823227.586179534',
    })
    messageId: string;
}
