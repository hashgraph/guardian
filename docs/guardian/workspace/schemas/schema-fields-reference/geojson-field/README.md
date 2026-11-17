---
tags:
  - concept
  - tag: new
    primary: true
---

# GeoJSON Field

A GeoJSON field holds the locations of a document - points, lines and polygons - in the standard GeoJSON format. A schema author adds it by choosing **GeoJSON** as the field type, and a user fills it in the document form by importing a `.geojson`, `.json`, `.kml` or `.kmz` file or by entering shapes manually.

#### The problem it solves

Almost every carbon project is tied to a place: a forest plot, a field, a project boundary. Stored as text or as a plain file, such a place cannot be checked, shown on a map, or read by another program. The GeoJSON field stores the location in a standard format, so Guardian can check it and draw it, and the Indexer and other programs can read it.

#### How it works

**The schema author decides which shapes are allowed.** In the field settings the author can pick the GeoJSON types the field accepts, for example only `Polygon`. This is stored in the field property `availableOptions`. With no choice made, every type is allowed.

**The form shows the value; a dialog edits it.** An empty field shows **Add geometry**. A filled field shows a map, a short summary such as `2 shapes · 1 polygon`, and the buttons **Edit** and **Clear**. **Add geometry** and **Edit** open a dialog with a preview map and two tabs: **Upload file** and **Enter manually**. **Save** writes the shapes into the field, **Cancel** leaves it unchanged. A very large value is not opened for editing: the field shows only its summary and size, and it can be cleared.

**A user can add locations in two ways.**

* **Import a file.** On the **Upload file** tab, a `.geojson`, `.json`, `.kml` or `.kmz` file is read in the browser. Its shapes appear on the preview map as grey candidates. Clicking a shape picks it - it turns green - and clicking it again unpicks it. **Select all** picks every shape, **Clear selection** unpicks them all, **Choose another file** replaces the file. Only the picked shapes become the field's value.
* **Enter manually.** On the **Enter manually** tab, each shape is a **Geometry** card with a **Type** and its coordinates. **Add geometry** adds a card, the delete icon removes one. Clicking the preview map adds a point to the shape, right-clicking removes it.

**Files are checked when they are chosen.** Guardian reads the whole file. A GeoJSON file must follow the GeoJSON standard (RFC 7946), and a KML or KMZ file must be readable; otherwise the file is refused with **Unsupported file format**. A KML or KMZ file may link to external content (`NetworkLink`); this content is not imported, and **Linked content won't be imported** lets the user continue with the rest of the file. The server runs the same checks when a document is submitted, including through the API.

**The value is checked before the document is created.** A shape of a type the field does not allow is rejected. A polygon whose ring crosses or touches itself, a hole outside its polygon, or two holes that cross or touch are shown as a red error under the field. An empty field shows `A GeoJSON object is required`. In each case the document is not created until the value is fixed.

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

**Debug log.** When `LOG_LEVEL=debug` is set for policy-service, Guardian writes a log entry for every accepted geospatial file: file name, format, file size (compressed and original), number of shapes and number of points. On the **Logs** page, select the **Debug** type to see these entries.

#### Key distinctions

* **The field value and the original file are two different things.** The value holds the shapes the user picked or entered. The original file holds everything the user uploaded. They can differ, and both can be downloaded.
* **A preview limit is not an upload limit.** Above a preview limit the file is still accepted - it is only not drawn. Only the maximum file size refuses a file.
* **The point of a file without preview is accepted in any field.** Even in a field that allows only `Polygon`, the first point of the file is accepted, because it is taken from a shape of an allowed type and marks where the file lies. Shapes the user adds are checked as usual.
* **For KMZ, the uncompressed size counts.** A small archive can hold a very large KML. Both the archive and the KML inside it must be under the maximum.
* **A value that was entered manually has no original file.** Neither does a document saved before original files were stored. Such a value is drawn, checked and downloaded as GeoJSON, with no **Download original file** button.
* **The drawable file size depends on device resources.** The defaults keep the map responsive on a typical device. Raising them lets larger files be drawn, but the real limit depends on the memory and performance of the user's device.

#### Related

* Task: [Fill in a GeoJSON Field](fill-in-geojson-field.md)
* Reference: [Available Schema Types](../../available-schema-types.md) - every schema field type, including GeoJSON.
