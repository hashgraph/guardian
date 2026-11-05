import assert from 'node:assert/strict';
import { KmlWellFormedChecker, NetworkLinkFinder, KmlCoordinateScanner, readFirstCoordinate } from '../dist/helpers/geo-file/index.js';

describe('KML well formed text', () => {
    const valid = ['<kml/>', '<?xml version="1.0"?><!DOCTYPE kml [<!ENTITY a "b">]><kml><!-- text --><![CDATA[<test>]]><Point/></kml>', '\n<kml> text </kml>\n'];
    const invalid = ['', '<kml>', '<kml><Point></kml>', '<kml/><kml/>', '<kml/>text', '<kml><!--', '<kml><![CDATA[', '<kml><Point', '<kml><?xml', '<kml/><!'];
    for (const text of [...valid, ...invalid]) {
        for (const size of [1, 7, Math.max(1, text.length)]) {
            it(`checks ${JSON.stringify(text)} in chunks of ${size}`, () => {
                const checker = new KmlWellFormedChecker();
                for (let i = 0; i < text.length; i += size) checker.write(text.slice(i, i + size));
                assert.equal(checker.finish(), valid.includes(text));
            });
        }
    }
});

describe('NetworkLink counting', () => {
    for (const count of [0, 1, 3]) {
        const text = '<kml><!--<NetworkLink/>--><![CDATA[<NetworkLink/>]]><kml:NetworkLink/>' + '<NetworkLink/>'.repeat(count) + '</kml>';
        for (let size = 1; size <= text.length; size++) {
            it(`counts ${count} links at chunk size ${size}`, () => {
                const finder = new NetworkLinkFinder();
                for (let i = 0; i < text.length; i += size) finder.write(text.slice(i, i + size));
                assert.equal(finder.finish(), count);
            });
        }
    }
});

describe('shared KML coordinate reader', () => {
    for (const [body, expected] of [
        ['<Placemark><Point><coordinates>1,2</coordinates></Point></Placemark>', [1, 2]],
        ['<Placemark><MultiGeometry><Point><coordinates>1,2</coordinates></Point><Point><coordinates>3,4</coordinates></Point></MultiGeometry></Placemark>', null],
        ['<NetworkLink><Region><LatLonAltBox><north>28</north><south>26</south><east>30</east><west>27</west></LatLonAltBox></Region></NetworkLink>', [27, 28]],
        ['<GroundOverlay><LatLonBox><north>22</north><south>20</south><east>24</east><west>21</west></LatLonBox></GroundOverlay>', [21, 22]],
        ['<Placemark><gx:Track><gx:coord>17 18 0</gx:coord></gx:Track></Placemark>', [17, 18, 0]]
    ]) {
        for (const size of [1, 7, 1048576]) {
            it(`reads ${body.slice(0, 40)} at ${size}`, async () => {
                assert.deepEqual(await readFirstCoordinate(new Blob([`<kml>${body}</kml>`]), new KmlCoordinateScanner(), size), expected);
            });
        }
    }
});
