import { DatabaseServer } from '@guardian/common';
import { CompareOptions, IArtifactRawData, IToolData } from '../compare/interfaces/index.js';
import { FileModel, SchemaModel, ToolModel } from '../compare/index.js';

/**
 * Loader
 */
export class ToolLoader {
    public static async load(
        toolId: string
    ) {
        //Tool
        const tool = await DatabaseServer.getToolById(toolId);

        if (!tool) {
            throw new Error('Unknown tool');
        }

        //Schemas
        const schemas = await DatabaseServer.getSchemas({ topicId: tool.topicId });

        //Artifacts
        const files = await DatabaseServer.getArtifacts({ toolId });
        const artifacts: IArtifactRawData[] = [];
        for (const file of files) {
            const artifact: IArtifactRawData = file;
            artifact.data = await DatabaseServer.getArtifactFileByUUID(file.uuid);
            artifacts.push(artifact);
        }

        return { tool, schemas, artifacts };
    }

    /**
     * Create tool model
     * @param toolId
     * @param options
     * @public
     * @static
     */
    public static async create(data: IToolData, options: CompareOptions): Promise<ToolModel> {
        //Tool
        const toolModel = new ToolModel(data.tool, options);

        //Schemas
        const schemaModels: SchemaModel[] = [];
        for (const schema of data.schemas) {
            const m = new SchemaModel(schema, options);
            m.setTool(data.tool);
            m.update(options);
            schemaModels.push(m);
        }
        toolModel.setSchemas(schemaModels);

        //Artifacts
        const artifactsModels: FileModel[] = [];
        for (const artifact of data.artifacts) {
            const f = new FileModel(artifact, options);
            f.update(options);
            artifactsModels.push(f);
        }
        toolModel.setArtifacts(artifactsModels);

        //Compare
        toolModel.update();

        return toolModel;
    }
}
