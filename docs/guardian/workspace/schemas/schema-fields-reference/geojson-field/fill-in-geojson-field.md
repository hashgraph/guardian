---
tags:
  - tasks
---

# Fill in a GeoJSON Field

Add the locations of a document to a GeoJSON field - by importing a file or entering shapes manually - and download them later. See [GeoJSON Field](README.md) for how the field, its checks and its limits behave.

#### Prerequisites

* A policy is running - or in **Dry Run** - and its form contains a GeoJSON field.
* To import a file: the file is GeoJSON, KML or KMZ and no larger than the maximum file size (100 MB by default).

#### Steps

**1. Open the geometry dialog**

1. Open the form and find the GeoJSON field.
2. Click **Add geometry**, or **Edit** if the field already has a value. The dialog opens on the **Upload file** tab.

**2. Import a file**

1. Drop the file on **Upload file (.json, .kml, .kmz, .geojson)**, or click it and choose the file.
2. The shapes of the file appear on the preview map as grey candidates. The file row shows its name, size and how many shapes are picked.
3. Click a shape to pick it - it turns green. Click it again to unpick it.
4. Click **Select all** to pick every shape, or **Clear selection** to unpick them all. **Choose another file** replaces the file.

If the field allows only some shape types, for example only `Polygon`, shapes of other types are not offered.

**3. Import a file that is too large to preview**

1. When the dialog **File too large to preview** opens, read which limit the file crossed: size, number of shapes or number of points.
2. Click **Cancel** to drop the file, or **Upload without preview** to keep it without drawing it.
3. Click **Add file point** to put the first point of the file into the field, or enter your own shapes. The document needs at least one location.

**4. Enter shapes manually**

1. Open the **Enter manually** tab.
2. Click **Add geometry**, choose the **Type** and enter the coordinates. You can also click the preview map to add points to the shape; right-click removes them.
3. Click **Add another geometry** for more shapes. Click the delete icon on a card to remove it.

**5. Save the dialog**

Click **Save** to put the shapes into the field, or **Cancel** to leave the field as it was. The field shows the map and a short summary of its shapes.

**6. Create the document**

1. Fix any red error under the field.
2. Click **Validate & Create**. If a file was imported, it is saved with the document.

**7. Download the locations**

1. Open the document with **View document**.
2. Click **Download GeoJSON** to get the field's shapes as a GeoJSON file.
3. If the value came from an imported file, click **Download original file** to get that file in its own format, unchanged.

#### Result

The document's GeoJSON field holds the locations you picked or entered, as ordinary GeoJSON. The document view draws them on a map. When a file was imported, the whole file is stored with the document and can be downloaded exactly as it was uploaded, including KML and KMZ files.

#### Troubleshooting

**`A GeoJSON object is required`.** The field is empty. Import or enter at least one location.

**A red error such as `Feature #0: Polygon: ring #0 must not cross or touch itself`.** A polygon is not valid: a ring crosses or touches itself, a hole lies outside its polygon, or two holes cross or touch. Unpick the shape or correct its coordinates.

**Unsupported file format.** The file is not valid GeoJSON (RFC 7946) or a readable KML or KMZ. Click **Go Back**, fix the file and import it again.

**Linked content won't be imported.** The KML or KMZ file contains `NetworkLink` features that point to external content. Click **Continue without links** to import the rest of the file, or **Cancel** to drop it.

**File exceeds size limit.** The file, or for KMZ the KML inside the archive, is above the maximum file size. Split the file, or ask an administrator to raise `GEOSPATIAL_MAX_FILESIZE_MB`.

**File too large to preview.** The file is above a preview limit. Use **Upload without preview**, or ask an administrator to raise the limit named in the dialog. See [Configuring the limits](README.md#configuring-the-limits).

**File cannot be imported - no coordinates were found.** The file has no coordinates Guardian can read. Check that it is valid GeoJSON, KML or KMZ.

**This browser cannot open KMZ files.** The browser cannot unpack the archive. Use a current version of Chrome, Edge, Firefox or Safari, or unpack the KMZ and import the KML inside it.

**File cannot be imported - no shapes of an allowed type.** The field allows only some shape types, and the file has none of them. Use a file with the allowed types, or change the field's allowed types in the schema.

**There is no Edit button.** The value is too large to edit in the browser. Use **Clear** and import or enter a smaller value.

**There is no Download original file button.** The value was entered manually rather than imported, or the document was created before original files were stored. Use **Download GeoJSON**.

#### Related

* Concept: [GeoJSON Field](README.md)
