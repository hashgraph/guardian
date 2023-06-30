import fieldsValidation from '@middlewares/validation/fields-validation';
import * as yup from 'yup';
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export const updateSettings = () => {
    const {ipfsStorageApiKey, operatorId, operatorKey} = fieldsValidation;
    return yup.object({
        body: yup.object({
            ipfsStorageApiKey,
            operatorId,
            operatorKey
        }),
    });
}

export class SettingsDTO {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    ipfsStorageApiKey: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    operatorId: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    operatorKey: string;
}
