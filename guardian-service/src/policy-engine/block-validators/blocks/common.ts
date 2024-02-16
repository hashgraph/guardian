import { BlockValidator, IBlockProp } from '@policy-engine/block-validators';

/**
 * Common block
 */
export class CommonBlock {
    /**
     * Validate block options
     * @param validator
     * @param config
     */
    public static async validate(validator: BlockValidator, ref: IBlockProp): Promise<boolean> {
        if (Array.isArray(ref.options.artifacts)) {
            for (const artifact of ref.options.artifacts) {
                if (!artifact) {
                    validator.addError(`Artifact does not exist`);
                    return false;
                }
                const file = await validator.getArtifact(artifact.uuid);
                if (!file) {
                    validator.addError(`Artifact with id "${artifact.uuid}" does not exist`);
                    return false;
                }
            }
        }
        return true;
    }
}