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

/** Row-count context for the EXPORT_ROW_CAP truncation, so a format that renders a footer/note (PDF) can say "showing 1,000 of N". `rows.length === shown` always; `totalMatching` may be larger. */
export interface ExportRowCountMeta {
    totalMatching: number;
    shown: number;
}

export interface Serializer {
    /**
     * @param fields Selected export-field-catalog keys, in display order — this is also the column/row-key order.
     * @param rows One plain object per record, keyed by the SAME field keys as `fields` (row sources may include
     *   extra keys not in `fields`; serializers must ignore anything not selected). Already truncated to
     *   EXPORT_ROW_CAP by the caller.
     * @param datasetTitle Human-readable dataset display name (e.g. "Projects", "Issuances" — see
     *   `getDatasetDisplayName()` in `export-field-catalog.ts`) used as the document title in formats that
     *   render one (PDF heading, XLSX title row/worksheet name). `CsvSerializer` ignores this: a title row
     *   above the header row would corrupt CSV's machine-parsing contract.
     * @param rowCountMeta True total vs. shown row count. `PdfSerializer` renders it as a footer note when
     *   `totalMatching > shown`; CSV/XLSX ignore it — a note row would corrupt CSV's tabular contract, and the
     *   cap is already communicated via the pre-download warning dialog instead.
     */
    serialize(
        fields: string[],
        rows: Record<string, unknown>[],
        datasetTitle: string,
        rowCountMeta?: ExportRowCountMeta,
    ): Promise<SerializedExport>;
}
