import { Status } from "../types/status.type";
import { IRate } from "../interfaces/rate.interface";
import { ArtifactModel } from "../models/artifact.model";

export class ArtifactsRate implements IRate<ArtifactModel> {
    public items: ArtifactModel[];
    public type: Status;
    public totalRate: number;

    constructor(artifact1: ArtifactModel, artifact2: ArtifactModel) {
        this.items = [artifact1?.toObject(), artifact2?.toObject()];
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
