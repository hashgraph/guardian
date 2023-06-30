import * as yup from 'yup';
import fieldsValidation from '../fields-validation'
import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString } from 'class-validator';
import { UserRole } from '@guardian/interfaces';

export const schemaSchema = () => {
  const {messageId} = fieldsValidation
  return yup.object({
    body: yup.object({
      messageId
    }),
  });
}

export const systemEntitySchema = () => {
  const {name, entity} = fieldsValidation
  return yup.object({
    body: yup.object({
      name, entity
    }),
  });
}

export class SystemSchemaDTO {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @IsIn([UserRole.STANDARD_REGISTRY, UserRole.USER])
  entity: string;

  [key: string]: any
}
