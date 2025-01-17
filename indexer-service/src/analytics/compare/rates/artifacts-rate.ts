import { Status } from '../types/index.js';
import { ArtifactModel } from '../models/index.js';
import { Rate } from './rate.js';

/**
 * Calculates the difference between two Artifacts
 */
export class ArtifactsRate extends Rate<ArtifactModel> {
    constructor(artifact1: ArtifactModel, artifact2: ArtifactModel) {
        super(artifact1, artifact2);
        if (artifact1 && artifact2) {
            this.totalRate = 100;
            this.type = Status.FULL;
        } else {
            if (artifact1) {
                this.type = Status.LEFT;
            } else {
                this.type = Status.RIGHT;
            }
            this.totalRate = -1;
        }
    }
}
