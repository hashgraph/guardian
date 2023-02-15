import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { Component, Input, OnInit } from '@angular/core';
import { IArtifact } from '@guardian/interfaces';
import { PolicyBlockModel } from "src/app/policy-engine/structures/policy-block.model";
import { ArtifactService } from 'src/app/services/artifact.service';

/**
 * Settings for all blocks.
 */
@Component({
    selector: 'artifact-properties',
    templateUrl: './artifact-properties.component.html',
    styleUrls: ['./artifact-properties.component.css']
})
export class ArtifactPropertiesComponent implements OnInit {
    policyArtifacts!: IArtifact[]

    @Input('policyId') policyId!: string;
    @Input('block') currentBlock!: PolicyBlockModel;
    @Input('readonly') readonly!: boolean;

    constructor(
        public artifact: ArtifactService,
    ) {
    }

    ngOnInit(): void {
        this.artifact.getArtifacts(this.policyId)
            .subscribe(result => {
                const artifacts = result.body as IArtifact[];
                this.policyArtifacts = artifacts.filter(artifact => artifact.type).map(artifact => {
                    return {
                        name: artifact.name,
                        uuid: artifact.uuid,
                        type: artifact.type,
                        extention: artifact.extention
                    } as any
                })
            });
    }

    changeArtifactPosition(event: CdkDragDrop<IArtifact[]>) {
        this.currentBlock?.changeArtifactPosition(event.previousIndex, event.currentIndex);
    }

    addArtifact(artifact: any) {
        this.currentBlock?.addArtifact(artifact);
    }

    removeArtifact(artifact: any) {
        this.currentBlock?.removeArtifact(artifact);
    }
}
