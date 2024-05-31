import { MongoNamingStrategy } from '@mikro-orm/core';

/**
 * Naming strategy for database
 */
export class DataBaseNamingStrategy extends MongoNamingStrategy {
    /**
     * Class to table name
     * @param entityName Class name
     * @returns Table name
     */
    classToTableName(entityName: string): string {
        return entityName.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
    }
}