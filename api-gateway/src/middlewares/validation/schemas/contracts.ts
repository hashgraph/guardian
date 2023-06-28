import * as yup from 'yup';
import fieldsValidation from '../fields-validation'
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export const retireSchema = () => {
    const {requestId} = fieldsValidation
    return yup.object({
        body: yup.object({
            requestId
        }),
    });
}

export const importSchema = () => {
  const { contractId } = fieldsValidation
  return yup.object({
    body: yup.object({
      contractId
    }),
  });
}

export const retireRequestSchema = () => {
  const {
    baseTokenId,
    oppositeTokenId,
    baseTokenCount,
    oppositeTokenCount,
    baseTokenSerials,
    oppositeTokenSerials
  } = fieldsValidation
  return yup.object({
    body: yup.object({
        baseTokenId,
        oppositeTokenId,
        baseTokenCount,
        oppositeTokenCount,
        baseTokenSerials,
        oppositeTokenSerials
    }),
  });
}

export class ImportContractDTO {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    contractId: string;

    [key: string]: any;
}
