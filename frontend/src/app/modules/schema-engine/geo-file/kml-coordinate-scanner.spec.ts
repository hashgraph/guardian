import { DOMParser } from '@xmldom/xmldom';
import { kml } from '@tmcw/togeojson';
import { GeoCoordinate, readFirstCoordinate } from './first-coordinate-reader';
import { KmlCoordinateScanner } from './kml-coordinate-scanner';

function firstPosition(text: string): GeoCoordinate | null {
    const converted = kml(new DOMParser().parseFromString(text, 'application/xml'));
    const feature = converted.features.find(item =>
        item?.geometry && item.geometry.type !== 'GeometryCollection'
    );
    if (!feature?.geometry) return null;
    let coordinates: any = 'coordinates' in feature.geometry
        ? feature.geometry.coordinates
        : null;
    while (Array.isArray(coordinates) && Array.isArray(coordinates[0])) coordinates = coordinates[0];
    if (!Array.isArray(coordinates) || coordinates.length < 2) return null;
    return coordinates.length >= 3
        ? [coordinates[0], coordinates[1], coordinates[2]]
        : [coordinates[0], coordinates[1]];
}

const wrap = (body: string) => `<?xml version="1.0"?><kml xmlns="http://www.opengis.net/kml/2.2" xmlns:gx="http://www.google.com/kml/ext/2.2"><Document>${body}</Document></kml>`;

const fixtures = [
    wrap('<Placemark><Point><coordinates>1,2</coordinates></Point></Placemark>'),
    wrap('<Placemark><description><![CDATA[<coordinates>0,0</coordinates>]]></description><!-- <coordinates>0,0</coordinates> --><Point><coordinates>3,4</coordinates></Point></Placemark>'),
    wrap('<Placemark><LineString><coordinates>5,6 7,8</coordinates></LineString></Placemark>'),
    wrap('<Placemark><LineString><coordinates>1,2</coordinates></LineString></Placemark><Placemark><Point><coordinates>9,10</coordinates></Point></Placemark>'),
    wrap('<Placemark><Polygon><outerBoundaryIs><LinearRing><coordinates>11,12 13,14 15,16 11,12</coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark>'),
    wrap('<Placemark><gx:Track><when>2020-01-01</when><gx:coord>17 18 0</gx:coord></gx:Track></Placemark>'),
    wrap('<Placemark><Track><coord>18 19 0</coord></Track></Placemark>'),
    wrap('<Placemark><gx:MultiTrack><gx:Track><gx:coord>19 20 0</gx:coord></gx:Track></gx:MultiTrack></Placemark>'),
    wrap('<GroundOverlay><LatLonBox><north>22</north><south>20</south><east>24</east><west>21</west></LatLonBox></GroundOverlay>'),
    wrap('<GroundOverlay><LatLonBox><north>2</north><south>0</south><east>2</east><west>0</west><rotation>90</rotation></LatLonBox></GroundOverlay>'),
    wrap('<GroundOverlay><gx:LatLonQuad><coordinates>25,26 27,26 27,24 25,24</coordinates></gx:LatLonQuad></GroundOverlay>'),
    wrap('<NetworkLink><Region><LatLonAltBox><north>28</north><south>26</south><east>30</east><west>27</west></LatLonAltBox></Region></NetworkLink>'),
    wrap('<GroundOverlay><LatLonBox><north>2</north><south>0</south><east>2</east><west>0</west></LatLonBox></GroundOverlay><Placemark><Point><coordinates>31,32</coordinates></Point></Placemark>'),
    wrap('<Placemark><MultiGeometry><Point><coordinates>1,2</coordinates></Point><Point><coordinates>3,4</coordinates></Point></MultiGeometry></Placemark><Placemark><Point><coordinates>33,34</coordinates></Point></Placemark>'),
    wrap('<Placemark><MultiGeometry><Point><coordinates>35,36</coordinates></Point></MultiGeometry></Placemark>'),
    wrap('<Placemark><Point><coordinates>1,2</coordinates></Point><LineString><coordinates>3,4 5,6</coordinates></LineString></Placemark><Placemark><Point><coordinates>36,37</coordinates></Point></Placemark>'),
    wrap('<Placemark><Polygon><outerBoundaryIs><LinearRing><coordinates>1,2 3,4</coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark><Placemark><Point><coordinates>37,38</coordinates></Point></Placemark>'),
    '<!DOCTYPE kml [<!ENTITY ignored "value">]><kml xmlns="http://www.opengis.net/kml/2.2"><Placemark><Point><coordinates>39,40</coordinates></Point></Placemark></kml>',
    wrap('<Placemark><Point><coordinates>&#51;&#55;,&#51;&#56;</coordinates></Point></Placemark>'),
    wrap('<Placemark><name>Минск</name><Point><coordinates>27.56,53.90</coordinates></Point></Placemark>')
];

const noCoordinateFixtures = [
    wrap(''),
    wrap('<Placemark><Point><coordinates/></Point></Placemark>'),
    wrap('<Placemark><MultiGeometry><Point><coordinates>1,2</coordinates></Point><Point><coordinates>3,4</coordinates></Point></MultiGeometry></Placemark>'),
    wrap('<NetworkLink><Link><href>https://example.com/a.kml</href></Link></NetworkLink>'),
    '<kml:kml xmlns:kml="http://www.opengis.net/kml/2.2"><kml:Placemark><kml:Point><kml:coordinates>1,2</kml:coordinates></kml:Point></kml:Placemark></kml:kml>'
];

describe('KmlCoordinateScanner', () => {
    for (const text of fixtures) {
        for (const chunkSize of [1, 7, 1024 * 1024]) {
            it(`matches kml() at ${chunkSize} bytes for fixture ${fixtures.indexOf(text)}`, async () => {
                const expected = firstPosition(text);
                const actual = await readFirstCoordinate(
                    new Blob([new TextEncoder().encode(text)]),
                    new KmlCoordinateScanner(),
                    chunkSize
                );
                expect(actual).toEqual(expected);
            });
        }
    }

    for (const text of noCoordinateFixtures) {
        for (const chunkSize of [1, 7, 1024 * 1024]) {
            it(`returns none at ${chunkSize} bytes for empty fixture ${noCoordinateFixtures.indexOf(text)}`, async () => {
                const actual = await readFirstCoordinate(
                    new Blob([new TextEncoder().encode(text)]),
                    new KmlCoordinateScanner(),
                    chunkSize
                );
                expect(actual).toBeNull();
            });
        }
    }

    it('reads a KML with line breaks around the root element', async () => {
        const text = '<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2">\n' +
            '<Document>\n<Placemark><Point><coordinates>1,2</coordinates></Point></Placemark>\n</Document>\n</kml>\n';
        for (const allowedTypes of [[], ['Point']]) {
            const actual = await readFirstCoordinate(new Blob([text]), new KmlCoordinateScanner(allowedTypes));
            expect(actual).toEqual([1, 2]);
        }
        const empty = await readFirstCoordinate(
            new Blob(['<?xml version="1.0"?>\n<kml>\n<Document/>\n</kml>\n']),
            new KmlCoordinateScanner()
        );
        expect(empty).toBeNull();
    });
});

describe('KmlCoordinateScanner allowed types', () => {
    const allTypes = ['Point', 'LineString', 'Polygon', 'MultiPoint', 'MultiLineString', 'MultiPolygon'];

    const firstAllowedPosition = (text: string, allowedTypes: string[]): GeoCoordinate | null => {
        const feature = kml(new DOMParser().parseFromString(text, 'application/xml')).features.find(item =>
            item?.geometry && item.geometry.type !== 'GeometryCollection' &&
            allowedTypes.includes(item.geometry.type)
        );
        if (!feature?.geometry) return null;
        let coordinates: any = 'coordinates' in feature.geometry ? feature.geometry.coordinates : null;
        while (Array.isArray(coordinates) && Array.isArray(coordinates[0])) coordinates = coordinates[0];
        if (!Array.isArray(coordinates) || coordinates.length < 2) return null;
        return coordinates.length >= 3
            ? [coordinates[0], coordinates[1], coordinates[2]]
            : [coordinates[0], coordinates[1]];
    };

    [...fixtures, ...noCoordinateFixtures].forEach((text, index) => {
        for (const allowedTypes of [allTypes, ['Point'], ['LineString'], ['Polygon']]) {
            it(`matches the first ${allowedTypes.join(' or ')} shape of kml() for fixture ${index}`, async () => {
                const actual = await readFirstCoordinate(
                    new Blob([new TextEncoder().encode(text)]),
                    new KmlCoordinateScanner(allowedTypes),
                    7
                );
                expect(actual).toEqual(firstAllowedPosition(text, allowedTypes));
            });
        }
    });

    it('stops at the first allowed shape', () => {
        const scanner = new KmlCoordinateScanner(['Polygon']);
        scanner.write(wrap(
            '<Placemark><LineString><coordinates>7,8 9,10</coordinates></LineString></Placemark>' +
            '<Placemark><Polygon><outerBoundaryIs><LinearRing><coordinates>1,2 3,4 5,6 1,2</coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark>'
        ).slice(0, -17));

        expect(scanner.settled).toBeTrue();
        expect(scanner.coordinate).toEqual([1, 2]);
    });

    it('treats a track of more than two points as a LineString and a shorter one as a Point', async () => {
        const long = wrap('<Placemark><gx:Track><gx:coord>1 2 0</gx:coord><gx:coord>3 4 0</gx:coord><gx:coord>5 6 0</gx:coord></gx:Track></Placemark>');
        const short = wrap('<Placemark><gx:Track><gx:coord>1 2 0</gx:coord><gx:coord>3 4 0</gx:coord></gx:Track></Placemark>');

        expect(await readFirstCoordinate(new Blob([long]), new KmlCoordinateScanner(['Point']))).toBeNull();
        expect(await readFirstCoordinate(new Blob([long]), new KmlCoordinateScanner(['LineString']))).toEqual([1, 2, 0]);
        expect(await readFirstCoordinate(new Blob([short]), new KmlCoordinateScanner(['Point']))).toEqual([1, 2, 0]);
    });
});
