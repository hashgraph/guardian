import { Policy } from "@entity/policy";
import { Guardians } from "@helpers/guardians";
import { findAllEntities } from "@helpers/utils";
import JSZip from "jszip";

export namespace PolicyImportExportHelper {
    /**
     * Generate Zip File  
     * @param policy policy to pack
     * 
     * @returns Zip file
     */
    export async function generateZipFile(policy: Policy): Promise<JSZip> {
        const guardians = new Guardians();

        const refs = findAllEntities(policy.config, 'schema');
        const tokenIds = findAllEntities(policy.config, 'tokenId');

        const [schemas, tokens] = await Promise.all([
            guardians.exportSchemes(refs),
            guardians.getTokens({ids: tokenIds})
        ]);

        const zip = new JSZip();
        zip.folder('schemas')
        for (let schema of schemas) {
            zip.file(`schemas/${schema.name}.json`, JSON.stringify(schema));
        }

        zip.folder('tokens')
        for (let token of tokens) {
            zip.file(`tokens/${token.tokenName}.json`, JSON.stringify(token));
        }
        zip.file(`policy.json`, JSON.stringify(policy));

        return zip;
    }

    /**
     * Return block instance reference
     * @param obj
     */
    export function GetBlockRef(obj: any): any {
        return obj as any;
    }

    /**
     * Return block options object
     * @param obj
     */
    export function GetBlockUniqueOptionsObject(obj: any): { [key: string]: any } {
        return obj.options;
    }
}
