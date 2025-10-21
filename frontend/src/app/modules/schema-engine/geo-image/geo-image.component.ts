import {
    Component,
    AfterViewInit,
    ElementRef,
    Input,
    ViewChild,
    OnChanges,
    SimpleChanges,
    OnDestroy,
} from '@angular/core';

import 'ol/ol.css';
import Map from 'ol/Map';
import View from 'ol/View';
import { Tile as TileLayer, Vector as VectorLayer } from 'ol/layer';
import OSM from 'ol/source/OSM';
import VectorSource from 'ol/source/Vector';
import Feature from 'ol/Feature';
import { fromExtent } from 'ol/geom/Polygon';
import { Fill, Stroke, Style } from 'ol/style';
import { transformExtent } from 'ol/proj';

@Component({
    selector: 'app-geo-image',
    template: `<div #map style="height: 515px; width: 100%;"></div>`,
})
export class GeoImageComponent implements AfterViewInit, OnChanges, OnDestroy {
    @Input() data?: { bbox?: number[] };
    @ViewChild('map', { static: true }) mapEl!: ElementRef<HTMLDivElement>;

    private map?: Map;
    private vectorSrc = new VectorSource();
    private vectorLayer = new VectorLayer({ source: this.vectorSrc });
    private inited = false;

    ngAfterViewInit() {
        this.inited = true;

        this.map = new Map({
            target: this.mapEl.nativeElement,
            layers: [
                new TileLayer({ source: new OSM() }),
                this.vectorLayer,
            ],
            view: new View({
                center: [0, 0],
                zoom: 2,
                maxZoom: 20,
            }),
        });

        this.vectorLayer.setStyle(new Style({
            stroke: new Stroke({ color: '#888', width: 1 }),
            fill: new Fill({ color: 'rgba(128,128,128,0.1)' }),
        }));

        this.renderBBox();
    }

    ngOnChanges(changes: SimpleChanges) {
        if (this.inited && changes['data']) {
            this.renderBBox();
        }
    }

    ngOnDestroy() {
        this.map?.setTarget(undefined);
    }

    private renderBBox() {
        if (this.map) {
            this.vectorSrc.clear();

            const bbox = this.data?.bbox;

            if (bbox && bbox.length >= 4) {
                const extent4326: [number, number, number, number] = [bbox[0], bbox[1], bbox[2], bbox[3]];
                const extent3857 = transformExtent(extent4326, 'EPSG:4326', 'EPSG:3857');

                const polygon = fromExtent(extent3857);
                const feature = new Feature({ geometry: polygon });

                this.vectorSrc.addFeature(feature);

                this.map.getView().fit(extent3857, { duration: 300, padding: [20, 20, 20, 20] });
            }
        }
    }
}
