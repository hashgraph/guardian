import { Component, Input } from '@angular/core';
import 'ol/ol.css';
import GeoJSON from 'ol/format/GeoJSON.js';
import Map from 'ol/Map.js';
import View from 'ol/View.js';
import { Circle as CircleStyle, Fill, Stroke, Style, Text } from 'ol/style.js';
import { Cluster, OSM, Vector as VectorSource } from 'ol/source.js';
import { Tile as TileLayer, Vector as VectorLayer } from 'ol/layer.js';
import { doubleClick, pointerMove } from 'ol/events/condition.js';
import Select from 'ol/interaction/Select.js';
import { Router } from '@angular/router';

const MAP_OPTIONS = {
    center: [0, 0],
    zoom: 0,
    maxZoom: 20,
};

const CLUSTER_DISTANCE = {
    distance: 35,
    minDistance: 20,
};
const CLUSTER = {
    RADIUS: 20,
    COLOR: '#19BE47',
    BORDER_COLOR: '#000',
    BORDER_WIDTH: 2,
    SELECTED_COLOR: '#fff',
    SELECTED_BORDER_COLOR: '#19BE47',
    FONT: 'bold 12px Inter, sans-serif',
    FONT_COLOR: '#fff',
};
const POINT = {
    RADIUS: 12,
    COLOR: '#19BE47',
    BORDER_COLOR: '#000',
    BORDER_WIDTH: 2,
    SELECTED_COLOR: '#fff',
    SELECTED_BORDER_COLOR: '#19BE47',
};

const cluster = new CircleStyle({
    radius: CLUSTER.RADIUS,
    fill: new Fill({ color: CLUSTER.COLOR }),
    stroke: new Stroke({
        color: CLUSTER.BORDER_COLOR,
        width: CLUSTER.BORDER_WIDTH,
    }),
});
const selectedCluster = new CircleStyle({
    radius: CLUSTER.RADIUS,
    fill: new Fill({ color: CLUSTER.SELECTED_COLOR }),
    stroke: new Stroke({
        color: CLUSTER.SELECTED_BORDER_COLOR,
        width: CLUSTER.BORDER_WIDTH,
    }),
});

const point = new CircleStyle({
    radius: POINT.RADIUS,
    fill: new Fill({ color: POINT.COLOR }),
    stroke: new Stroke({
        color: POINT.BORDER_COLOR,
        width: POINT.BORDER_WIDTH,
    }),
});
const selectedPoint = new CircleStyle({
    radius: POINT.RADIUS,
    fill: new Fill({ color: POINT.SELECTED_COLOR }),
    stroke: new Stroke({
        color: POINT.SELECTED_BORDER_COLOR,
        width: POINT.BORDER_WIDTH,
    }),
});

const styles: any = {
    Point: new Style({
        image: point,
    }),
};
function styleFunction(feature: any) {
    const size = feature.get('features').length;
    return size > 1
        ? new Style({
              image: cluster,
              text: new Text({
                  font: CLUSTER.FONT,
                  text: size.toString(),
                  fill: new Fill({
                      color: CLUSTER.FONT_COLOR,
                  }),
              }),
          })
        : styles.Point;
}

const activeStyles: any = {
    Point: new Style({
        image: selectedPoint,
    }),
    Cluster: new Style({
        image: selectedCluster,
    }),
};
function activeStyleFunction(feature: any) {
    const size = feature.get('features').length;
    return activeStyles[size > 1 ? 'Cluster' : 'Point'];
}

@Component({
    selector: 'app-project-locations',
    standalone: true,
    imports: [],
    templateUrl: './project-locations.component.html',
    styleUrl: './project-locations.component.scss',
})
export class ProjectLocationsComponent {
    public map!: Map;

    @Input() projectLocations!: { coordinates: string; projectId: string }[];

    constructor(private router: Router) {}

    ngOnChanges() {
        setTimeout(() => {
            const features = this.projectLocations.map((item) => {
                const coordinates = item.coordinates
                    .split('|')
                    .map((coordinate: string) => parseFloat(coordinate));
                return {
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates,
                    },
                    properties: {
                        projectId: item.projectId,
                    },
                };
            });
            const vectorSource = new VectorSource({
                features: new GeoJSON({
                    featureProjection: 'EPSG:3857',
                }).readFeatures({
                    type: 'FeatureCollection',
                    features,
                }),
            });
            const clusterSource = new Cluster({
                distance: CLUSTER_DISTANCE.distance,
                minDistance: CLUSTER_DISTANCE.minDistance,
                source: vectorSource,
            });
            const clusters = new VectorLayer({
                source: clusterSource,
                style: styleFunction,
            });
            this.map = new Map({
                layers: [
                    new TileLayer({
                        source: new OSM(),
                    }),
                    clusters,
                ],
                target: 'map',
                view: new View(MAP_OPTIONS),
            });
            const selectHover = new Select({
                condition: pointerMove,
                style: activeStyleFunction,
            });
            const selectClick = new Select({
                condition: doubleClick,
            });
            selectClick.getFeatures().on('add', (event) => {
                // tslint:disable-next-line:no-shadowed-variable
                const features = event.element.get('features');
                if (features?.length !== 1) {
                    return;
                }
                this.router.navigate([
                    '/vc-documents',
                    features[0].get('projectId'),
                ]);
            });
            this.map.addInteraction(selectHover);
            this.map.addInteraction(selectClick);
        }, 100);
    }
}
