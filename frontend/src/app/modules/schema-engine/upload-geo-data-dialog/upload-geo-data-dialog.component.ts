import { Component } from '@angular/core';
import { Feature, FeatureCollection } from 'geojson';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';

@Component({
    selector: 'upload-geo-data-dialog',
    templateUrl: './upload-geo-data-dialog.component.html',
    styleUrls: ['./upload-geo-data-dialog.component.scss'],
})
export class UploadGeoDataDialog {
    featureCollection: FeatureCollection;
    features: Feature[] = [];

    constructor(
        public ref: DynamicDialogRef,
        public config: DynamicDialogConfig
    ) {
        this.featureCollection = config.data.featureCollection;

        if (this.featureCollection?.features?.length > 0) {
            this.features = this.featureCollection.features;
        }
    }

    ngOnInit() {
    }

    setData(data: any) {
    }

    onClose(): void {
        this.ref.close(false);
    }

    onConfirm(): void {
        this.ref.close(false);
    }
}
