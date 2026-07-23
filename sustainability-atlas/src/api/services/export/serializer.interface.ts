/**
 * Shared contract for the export engine's three output formats: hand-rolled CSV, `exceljs` XLSX, `pdfmake` PDF.
 * By the time `ExportsService.generate()` calls a `Serializer`, the full filtered dataset has already been
 * fetched, so this is a single-shot "hand me the selected fields + full row set, hand back one generated file"
 * contract that does not itself stream bytes to the HTTP response — `ExportsController.download()` wraps the
 * resulting `Buffer` in a `StreamableFile`.
 */
export interface SerializedExport {
    /** Fully-generated file content, ready to hand to `StreamableFile`. */
    content: Buffer;
    /** MIME type for the `StreamableFile`'s `type` option / `Content-Type` header. */
    mime: string;
    /** File extension (no leading dot) used to build the download filename. */
    extension: string;
}

export interface Serializer {
    /**
     * @param fields Selected export-field-catalog keys, in display order — this is also the column/row-key order.
     * @param rows One plain object per record, keyed by the SAME field keys as `fields` (row sources may include
     *   extra keys not in `fields`; serializers must ignore anything not selected).
     */
    serialize(fields: string[], rows: Record<string, unknown>[]): Promise<SerializedExport>;
}
