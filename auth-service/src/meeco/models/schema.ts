export interface IMeecoSchema {
  name: string,
  schema_json: IMeecoSchemaData,
  organization_ids: string[],
}

export interface IMeecoSchemaData {
  $schema: string,
  description: string,
  name: string,
  type: string,
  properties: any,
  required: string[],
  additionalProperties: boolean,
}
