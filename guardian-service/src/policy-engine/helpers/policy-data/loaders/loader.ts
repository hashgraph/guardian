import { DatabaseServer } from '@guardian/common';
import JSZip from 'jszip';

/**
 * Policy data loader
 */
export abstract class PolicyDataLoader<T = any> {
    /**
     * Database server instance
     */
    protected db!: DatabaseServer;

    constructor(
        protected policyId: string,
        protected policyTopicId: string,
        protected policyInstanceTopicId: string,
        protected isDryRun = false
    ) {
        this.db = isDryRun
            ? new DatabaseServer(policyId)
            : new DatabaseServer();
    }

    /**
     * Get data
     * @param args Parameters
     */
    abstract get(...args: any): Promise<T[]>;

    /**
     * Get data from file
     * @param content File content
     * @param path Path
     * @returns Data
     */
    static async getFromFile(content: JSZip, path: string): Promise<any[]> {
        const filesStringArray = await Promise.all(
            Object.entries(content.files)
                .filter((file) => !file[1].dir)
                .filter((file) => new RegExp(`^${path}/.+`).test(file[0]))
                .map((file) => file[1].async('string'))
        );

        return (
            filesStringArray
                .map((item) => JSON.parse(item))
                .sort((a, b) => b.createDate - a.createDate) || []
        );
    }
}
