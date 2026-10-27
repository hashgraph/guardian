---
tags:
  - tasks
---

# Fill in a GeoJSON Field

Add the locations of a document to a GeoJSON field - by drawing on the map, pasting GeoJSON, or importing a file - and download them later. See [GeoJSON Field](README.md) for how the field, its checks and its limits behave.

#### Prerequisites

* A policy is running - or in **Dry Run** - and its form contains a GeoJSON field.
* To import a file: the file is GeoJSON, KML or KMZ and no larger than the maximum file size (100 MB by default).

#### Steps

**1. Draw a location on the map**

1. Open the form and find the GeoJSON field. It opens in the **Form** view, with a map.
2. Click the map to place a marker. For a line or a polygon, click each point and double-click to finish. Right-click removes the points of a shape you have not finished.
3. To type a shape instead, click **Add Geometry**, choose its **Type** and enter its **Coordinates**.
4. To remove a shape, click **Delete Geometry** on its row.

**2. Paste GeoJSON**

1. Switch the field to **JSON**.
2. Paste GeoJSON into the **GeoJSON** box. The shapes on the map are replaced by the pasted value.

**3. Import a file**

1. Switch the field to **JSON**.
2. Drop the file on **Upload file (.json, .kml, .kmz, .geojson)**, or click it and choose the file.
3. The field returns to the map. The shapes of the file appear as grey candidates.
4. Click a shape to select it - it turns green and its coordinates appear below the map. Click it again to deselect it.
5. Click **Include all** to select every shape, or **Clear** to return them all to grey candidates.

If the field allows only some shape types, for example only `Polygon`, shapes of other types are not offered.

**4. Import a file that is too large to preview**

1. When the dialog **File too large to preview** opens, read which limit the file crossed: size, number of shapes or number of points.
2. Click **Cancel** to drop the file, or **Upload without preview** to keep it without drawing it.
3. The map shows one grey point - the first point of the file - and a notice that the file is too large to show on the map.
4. Click **Add file point** to put that point into the field, or draw your own shapes. The document needs at least one location.

**5. Create the document**

1. Fix any red error under the field. **Validate & Create** stays disabled while the field is empty or a selected polygon is invalid.
2. Click **Validate & Create**. If a file was imported, it is saved with the document.

**6. Download the locations**

1. Open the document with **View document**.
2. Click **Download GeoJSON** to get the field's shapes as a GeoJSON file.
3. If the value came from an imported file, click **Download original file** to get that file in its own format, unchanged.

#### Result

The document's GeoJSON field holds the locations you drew, pasted or selected, as ordinary GeoJSON. The document view draws them on a map. When a file was imported, the whole file is stored with the document and can be downloaded exactly as it was uploaded, including KML and KMZ files.

#### Troubleshooting

**`A GeoJSON object is required`.** The field is empty. Draw, paste or import at least one location.

**A red error such as `Feature #0: Polygon: ring #0 must not cross or touch itself`.** A polygon is not valid: a ring crosses or touches itself, a hole lies outside its polygon, or two holes cross or touch. Deselect the shape or correct its coordinates.

**File exceeds size limit.** The file, or for KMZ the KML inside the archive, is above the maximum file size. Split the file, or ask an administrator to raise `GEOSPATIAL_MAX_FILESIZE_MB`.

**File too large to preview.** The file is above a preview limit. Use **Upload without preview**, or ask an administrator to raise the limit named in the dialog. See [Configuring the limits](README.md#configuring-the-limits).

**File cannot be imported - no coordinates were found.** The file has no coordinates Guardian can read. Check that it is valid GeoJSON, KML or KMZ.

**This browser cannot open KMZ files.** The browser cannot unpack the archive. Use a current version of Chrome, Edge, Firefox or Safari, or unpack the KMZ and import the KML inside it.

**File cannot be imported - no shapes of an allowed type.** The field allows only some shape types, and the file has none of them. Use a file with the allowed types, or change the field's allowed types in the schema.

**There is no Download original file button.** The value was drawn or pasted rather than imported, or the document was created before original files were stored. Use **Download GeoJSON**.

#### Related

* Concept: [GeoJSON Field](README.md)
