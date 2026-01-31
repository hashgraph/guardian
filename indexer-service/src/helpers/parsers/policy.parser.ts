import { DataBaseHelper } from '@indexer/common';
import JSZip from 'jszip';
export interface IPolicyComponents {
    policy: any;
    tokens: any[];
    schemas: any[];
    artifacts: any[];
    tags: any[];
    tools: any[];
}
export const POLICY_FILE_NAME = 'policy.json';
export async function parsePolicyFile(
    zipFile: any,
    includeArtifactsData: boolean = false
): Promise<IPolicyComponents | null> {
    try {
        const zip = new JSZip();
        const content = await zip.loadAsync(zipFile);
        if (
            !content.files[POLICY_FILE_NAME] ||
            content.files[POLICY_FILE_NAME].dir
        ) {
            throw new Error('Zip file is not a policy');
        }
        const policyString = await content.files[POLICY_FILE_NAME].async('string');
        const policy = JSON.parse(policyString);

        const fileEntries = Object.entries(content.files).filter(
            (file) => !file[1].dir
        );
        const [
            tokensStringArray,
            schemasStringArray,
            toolsStringArray,
            tagsStringArray,
        ] = await Promise.all([
            Promise.all(
                fileEntries
                    .filter((file) => /^tokens\/.+/.test(file[0]))
                    .map((file) => file[1].async('string'))
            ),
            Promise.all(
                fileEntries
                    .filter((file) => /^schem[a,e]s\/.+/.test(file[0]))
                    .map((file) => file[1].async('string'))
            ),
            Promise.all(
                fileEntries
                    .filter((file) => /^tools\/.+/.test(file[0]))
                    .map((file) => file[1].async('string'))
            ),
            Promise.all(
                fileEntries
                    .filter((file) => /^tags\/.+/.test(file[0]))
                    .map((file) => file[1].async('string'))
            ),
        ]);

        const tokens = tokensStringArray.map((item) => JSON.parse(item));
        const schemas = schemasStringArray.map((item) => JSON.parse(item));
        const tools = toolsStringArray.map((item) => JSON.parse(item));
        const tags = tagsStringArray.map((item) => JSON.parse(item));

        const metaDataFile = Object.entries(content.files).find(
            (file) => file[0] === 'artifacts/metadata.json'
        );
        const metaDataString =
            (metaDataFile && (await metaDataFile[1].async('string'))) || '[]';
        const metaDataBody: any[] = JSON.parse(metaDataString);

        let artifacts: any;
        if (includeArtifactsData) {
            const data = fileEntries
                .filter(
                    (file) =>
                        /^artifacts\/.+/.test(file[0]) &&
                        file[0] !== 'artifacts/metadata.json'
                )
                .map(async (file) => {
                    const uuid = file[0].split('/')[1];
                    const artifactMetaData = metaDataBody.find(
                        (item) => item.uuid === uuid
                    );
                    return {
                        name: artifactMetaData.name,
                        extention: artifactMetaData.extention,
                        uuid: artifactMetaData.uuid,
                        data: await file[1].async('nodebuffer'),
                    };
                });
            artifacts = await Promise.all(data);
        } else {
            artifacts = metaDataBody.map((artifactMetaData) => {
                return {
                    name: artifactMetaData.name,
                    extention: artifactMetaData.extention,
                    uuid: artifactMetaData.uuid,
                    data: null,
                };
            });
        }

        return { policy, tokens, schemas, artifacts, tags, tools };
    } catch (error) {
        console.log('Failed to parse policy')
        return null;
    }
}

export async function getPolicyData(policyRow: any) {
    const policyFileName = policyRow?.files[0];
    if(!policyFileName) {
        return null;
    }
    const fileBuffer = await DataBaseHelper.loadFile(policyFileName, true);
    const policyData = await parsePolicyFile(fileBuffer, false);
    
    return policyData;
}