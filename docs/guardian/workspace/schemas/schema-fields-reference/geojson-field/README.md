---
tags:
  - concept
  - tag: new
    primary: true
---

# GeoJSON Field

A GeoJSON field holds the locations of a document - points, lines and polygons - in the standard GeoJSON format. A schema author adds it by choosing **GeoJSON** as the field type, and a user fills it in the document form by drawing on a map, pasting GeoJSON text, or importing a `.geojson`, `.json`, `.kml` or `.kmz` file.

#### The problem it solves

Almost every carbon project is tied to a place: a forest plot, a field, a project boundary. Stored as text or as a plain file, such a place cannot be checked, shown on a map, or read by another program. The GeoJSON field stores the location in a standard format, so Guardian can check it and draw it, and the Indexer and other programs can read it.

#### How it works

**The schema author decides which shapes are allowed.** In the field settings the author can pick the GeoJSON types the field accepts, for example only `Polygon`. This is stored in the field property `availableOptions`. With no choice made, every type is allowed.

**The form shows the field in two views.** The **Form** view shows a map with the field's shapes and a panel with the type and coordinates of each shape. The **JSON** view shows the same value as GeoJSON text, and is also where a file is imported. Both views edit the same value.

**A user can add locations in three ways.**

* **Draw on the map.** Click to place a marker. Double-click to finish a line or a polygon. Right-click removes the temporary points of an unfinished line or polygon. **Add Geometry** adds a shape by typing its type and coordinates; **Delete Geometry** removes one.
* **Paste GeoJSON.** Text pasted in the **JSON** view replaces the shapes on the map.
* **Import a file.** A `.geojson`, `.json`, `.kml` or `.kmz` file is read in the browser. Its shapes appear on the map as grey candidates. Clicking a shape selects it - it turns green and its coordinates appear in the panel - and clicking it again deselects it. **Include all** selects every shape, **Clear** returns them all to grey candidates. Only the selected shapes become the field's value.

**The value is checked before the document is created.** A shape of a type the field does not allow is rejected. A polygon whose ring crosses or touches itself, a hole outside its polygon, or two holes that cross or touch are shown as a red error under the field. An empty field shows `A GeoJSON object is required`. In each case **Validate & Create** stays disabled until the value is fixed.

**Imported files are checked against size and complexity limits.** A browser cannot draw a very large file without freezing, so every file is compared with five limits before anything is drawn:

| Limit | Default | Applies to |
| --- | --- | --- |
| Preview size, GeoJSON | 5 MB | `.geojson` and `.json` files |
| Preview size, KML and KMZ | 10 MB | `.kml` files, and the uncompressed KML inside a `.kmz` |
| Maximum file size | 100 MB | every file, and for KMZ both the archive and the KML inside it |
| Shapes in preview | 1,500 | every file |
| Points in preview | 20,000 | every file |

A file above the maximum size is refused with the dialog **File exceeds size limit**; the server checks the same maximum again when the document is submitted. A file above a preview limit opens **File too large to preview**: **Cancel** drops it, **Upload without preview** keeps it without drawing it. The map then shows only the first point found in the file, and **Add file point** puts that point into the value. A file with no coordinates, or with no shape of an allowed type, is refused with **File cannot be imported**.

**An imported file is kept with the document.** Until the form is submitted, the file stays in the user's browser, so reloading the page or saving a draft does not lose it. When the document is created, Guardian saves the whole uploaded file in IPFS, separately from the document. The document's field holds the selected shapes with all their coordinates - or one point, for a file without preview - plus a link to that file. The value stays ordinary GeoJSON, so a program that does not know about the link still reads it correctly. Guardian never changes the file itself: GeoJSON and KML files are stored compressed only to save space, KMZ files are already compressed and are stored as they are, and a download always returns the uploaded file byte for byte.

**The field is shown on a map wherever the document is read.** In the read-only document view, Guardian draws the stored shapes. **Download GeoJSON** saves the field's shapes as a GeoJSON file. When the value came from an imported file, **Download original file** saves that file in its own format - `.geojson`, `.kml` or `.kmz`. The Indexer shows and downloads the same value.

#### Configuring the limits

The limits are environment variables of the Guardian services. A missing, empty, zero or non-numeric value falls back to the default.

| Variable | Default |
| --- | --- |
| `GEOJSON_PREVIEW_MAX_FILESIZE_MB` | `5` |
| `KML_PREVIEW_MAX_FILESIZE_MB` | `10` |
| `GEOSPATIAL_MAX_FILESIZE_MB` | `100` |
| `GEOSPATIAL_PREVIEW_MAX_FEATURES` | `1500` |
| `GEOSPATIAL_PREVIEW_MAX_POINTS` | `20000` |

The browser reads the current values from `GET /settings/geospatial-limits`, so a change applies to the form after the services restart, with no frontend rebuild.

#### Key distinctions

* **The field value and the original file are two different things.** The value holds the shapes the user selected or drew. The original file holds everything the user uploaded. They can differ, and both can be downloaded.
* **A preview limit is not an upload limit.** Above a preview limit the file is still accepted - it is only not drawn. Only the maximum file size refuses a file.
* **The point of a file without preview is accepted in any field.** Even in a field that allows only `Polygon`, the first point of the file is accepted, because it is taken from a shape of an allowed type and marks where the file lies. Shapes the user adds are checked as usual.
* **For KMZ, the uncompressed size counts.** A small archive can hold a very large KML. Both the archive and the KML inside it must be under the maximum.
* **A value that was drawn or pasted has no original file.** Neither does a document saved before original files were stored. Such a value is drawn, checked and downloaded as GeoJSON, with no **Download original file** button.
* **Browser limits still exist.** The defaults keep the map responsive on a typical computer. Raising them lets larger files be drawn, but how large a file a browser can really draw depends on the computer.

#### Related

* Task: [Fill in a GeoJSON Field](fill-in-geojson-field.md)
* Reference: [Available Schema Types](../../available-schema-types.md) - every schema field type, including GeoJSON.
