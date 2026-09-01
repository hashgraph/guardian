import type {
    Content,
    CustomTableLayout,
    Margins,
    StyleDictionary,
    TDocumentDefinitions,
    TFontDictionary,
} from 'pdfmake/interfaces';
import { ImpactSummaryResponseDto } from '../../dto/impact-summary.dto';
import { SA_LOGO_DATA_URI } from './logo-asset';

/**
 * pdfmake docDefinition skeleton for the Impact Summary PDF — rebuilt to match the "Sustainability Atlas"
 * reference design (cream/paper palette, card-based sections, Credits by Registry/Methodology/Project
 * tables). Running header/footer, hero title block, badge row, 5-tile Key Portfolio Metrics, then the full
 * data-section breakdown (Credits by Sector, Geographic Distribution, Credits by Registry/Methodology/
 * Project, SDG Contributions, Disclosure & Methodology Notes, closing attribution).
 *
 * Typography: the reference design specifies Google "Inter", which is not available server-side (no Inter
 * or Geist .ttf exists anywhere in the repo). Rather than the standard-14 Helvetica this used to render
 * with — whose PostScript metrics read noticeably dated next to the reference — it uses the Roboto TTFs
 * that ship inside the `pdfmake` package itself. Roboto is a humanist grotesque much closer to Inter, and
 * because `pdfmake` is a regular `dependencies` entry whose whole tree is copied into the production image,
 * the files are already present at runtime with no download, vendoring or vfs table.
 *
 * Caveat: pdfmake bundles Roboto Regular/Medium/Italic/MediumItalic but **no Bold**, so the `bold` slot maps
 * to Medium (500). The reference's 700-weight hero title therefore renders slightly lighter than the design.
 *
 * Rounded corners: pdfmake tables cannot round their corners at all — a table's borders are always straight
 * rules — which is why an earlier pass came out looking uniformly square against the reference's soft 12px
 * cards. Anything with a knowable size is therefore drawn with `roundedPanel()` below, which lays a `canvas`
 * rounded rect down and overlays the content on top of it. The dynamic-height data-table cards keep square
 * corners on purpose: reserving a height for content whose length isn't known until layout would clip it.
 *
 * This file only builds the `TDocumentDefinitions` object — it never calls `pdfMake` itself, keeping it a
 * pure, easily-unit-testable builder.
 */

// ─────────────────────────────────────────────────────────────────────────
// Fonts
// ─────────────────────────────────────────────────────────────────────────

/** Named font family referenced by `defaultStyle.font` below. */
export const PDF_FONT_FAMILY = 'Roboto';

/**
 * Font descriptor dictionary for `pdfMake.setFonts(...)`.
 *
 * pdfmake's server API resolves each value either from its in-memory virtual FS or, failing that, as a path
 * on disk, so pointing straight at the packaged .ttf files is enough — no vfs registration needed.
 * `require.resolve` (rather than a path built from `__dirname`) is deliberate: this module is compiled into
 * `dist/`, so a `__dirname`-relative path would resolve inside the build output and break, whereas module
 * resolution finds `node_modules/pdfmake` from either location.
 */
export const IMPACT_SUMMARY_PDF_FONTS: TFontDictionary = {
    Roboto: {
        normal: require.resolve('pdfmake/fonts/Roboto/Roboto-Regular.ttf'),
        // pdfmake ships no Roboto-Bold; Medium (500) is the heaviest weight available.
        bold: require.resolve('pdfmake/fonts/Roboto/Roboto-Medium.ttf'),
        italics: require.resolve('pdfmake/fonts/Roboto/Roboto-Italic.ttf'),
        bolditalics: require.resolve('pdfmake/fonts/Roboto/Roboto-MediumItalic.ttf'),
    },
};

// ─────────────────────────────────────────────────────────────────────────
// Palette + styles (mirrors the "Sustainability Atlas" reference design's cream/paper palette)
// ─────────────────────────────────────────────────────────────────────────

const COLORS = {
    // Backgrounds
    pageBg: '#F6F4EC',
    cardBg: '#FFFFFF',
    tableHeadBg: '#F0EDE2',
    greenTint: '#E3F3EC',
    neutralBadgeBg: '#FFFFFF',
    // Borders / rules
    border: '#E4E0D3',
    // Text
    text: '#12291F',
    body: '#16221C',
    muted: '#6B7269',
    mutedLight: '#8B8478',
    // Accents
    green: '#2EA37A',
    greenDark: '#1F5C4A',
    amber: '#C98A2C',
    white: '#FFFFFF',
} as const;

/** Sector-bar color cycle, by rank (matches the reference design's 4-color sequence). */
const SECTOR_COLORS = [COLORS.text, COLORS.mutedLight, COLORS.green, COLORS.amber];

/**
 * Type scale, mapped from the reference design's CSS pixel sizes at the 1px = 0.75pt ratio
 * (28px hero -> 21pt, 20px section heading -> 15pt, 13px body -> 9.75pt, 12px label -> 9pt).
 *
 * The dense 5-7 column data tables deliberately stay below the reference's 13px body size: at 9.75pt their
 * hand-tuned columns no longer fit inside the 515pt content width and numbers start getting clipped, so
 * `tableCellText` holds at 8.5pt. Fidelity on the prose, density where the data needs it.
 */
const PDF_STYLES: StyleDictionary = {
    eyebrow: { fontSize: 8, bold: true, color: COLORS.muted, characterSpacing: 0.5 },
    // -0.2 characterSpacing is the reference's `letter-spacing: -0.01em` on the hero at this size.
    h1: { fontSize: 21, bold: true, color: COLORS.text, characterSpacing: -0.2, margin: [0, 3, 0, 3] },
    subtitle: { fontSize: 9.75, color: COLORS.muted, margin: [0, 0, 0, 6] },
    badgeText: { fontSize: 9 },
    metaLabel: { fontSize: 9, color: COLORS.muted },
    metaValue: { fontSize: 9, bold: true, color: COLORS.text },
    metricLabel: { fontSize: 8.5, color: COLORS.muted },
    // Size is chosen per-value by `fitValueFontSize()`; this is only the fallback/base.
    metricValue: { fontSize: 20, bold: true, color: COLORS.text },
    metricSublabel: { fontSize: 7, color: COLORS.mutedLight },
    footerNote: { fontSize: 7.5, color: COLORS.mutedLight },
    // Data-section styles
    sectionHeader: { fontSize: 15, bold: true, color: COLORS.text, margin: [0, 22, 0, 10] },
    // The reference renders these in-card captions as small muted regular text, not bold headings.
    cardTitle: { fontSize: 9, color: COLORS.muted, margin: [0, 0, 0, 10] },
    barLabel: { fontSize: 9, color: COLORS.body },
    barValue: { fontSize: 9, color: COLORS.muted },
    // Uppercase column headers; characterSpacing stands in for the reference's `letter-spacing: 0.04em`.
    tableHeaderText: { fontSize: 7.5, bold: true, color: COLORS.muted, characterSpacing: 0.3 },
    tableCellText: { fontSize: 8.5, color: COLORS.body },
    noteText: { fontSize: 8, italics: true, color: COLORS.mutedLight, margin: [0, 8, 0, 0] },
    sdgName: { fontSize: 8, bold: true, color: COLORS.text },
    sdgCount: { fontSize: 7.5, color: COLORS.muted },
    quadTitle: { fontSize: 9.75, bold: true, color: COLORS.text, margin: [0, 0, 0, 5] },
    quadBody: { fontSize: 9, color: COLORS.muted },
    bannerTitle: { fontSize: 11, bold: true, color: COLORS.greenDark },
    bannerBody: { fontSize: 9, color: COLORS.body },
    // Slightly smaller than bannerBody so a full DID needs fewer wrapped lines. See DID_FONT_SIZE.
    didValue: { fontSize: 8, color: COLORS.body },
};

// ─────────────────────────────────────────────────────────────────────────
// Geometry — page metrics, corner radii, and text-fitting
// ─────────────────────────────────────────────────────────────────────────

const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;

const PAGE_MARGIN_X = 40;
/** Usable content width. Everything horizontal derives from this rather than repeating a literal. */
const CONTENT_WIDTH = A4_WIDTH - PAGE_MARGIN_X * 2; // 515.28

/** Corner radii, from the reference's `border-radius` values at the 0.75 px->pt ratio. */
const RADIUS = {
    card: 9, // 12px
    small: 4.5, // 6px
} as const;

/**
 * Exact text measurement, so anything drawn on a fixed-size rounded panel can be sized to actually fit it.
 *
 * Estimating from character count does not work here: average glyph width swings far too much between
 * strings (a length-based estimate put "Data synced: Jul 30, 2026" ~58pt wider than it really is, which
 * pushed its pill clean off the page). So widths come from the font itself.
 *
 * `fontkit` is read through pdfmake's dependency tree rather than declared in package.json on purpose: the
 * Docker build installs with `--frozen-lockfile`, which fails outright if package.json gains a dependency
 * the lockfile does not list as direct. The coupling is safe regardless — pdfmake embeds the .ttf files this
 * template registers *via* fontkit, so a pdfmake that could render this document without fontkit present
 * cannot exist. `advanceWidth / unitsPerEm * fontSize` is precisely what pdfmake measures with internally.
 */
interface FontkitFont {
    layout(text: string): { advanceWidth: number };
    unitsPerEm: number;
}
// eslint-disable-next-line @typescript-eslint/no-var-requires
const fontkit = require('fontkit') as { openSync(filePath: string): FontkitFont };

const fontCache = new Map<string, FontkitFont>();

function loadFont(bold: boolean): FontkitFont {
    const filePath = bold
        ? (IMPACT_SUMMARY_PDF_FONTS.Roboto.bold as string)
        : (IMPACT_SUMMARY_PDF_FONTS.Roboto.normal as string);
    let font = fontCache.get(filePath);
    if (!font) {
        font = fontkit.openSync(filePath);
        fontCache.set(filePath, font);
    }
    return font;
}

/** Rendered width of `text` in points. Mirrors pdfmake's own measurement, including `characterSpacing`. */
function measureText(text: string, fontSize: number, opts: { bold?: boolean; characterSpacing?: number } = {}): number {
    const { bold = false, characterSpacing = 0 } = opts;
    const font = loadFont(bold);
    const advance = (font.layout(text).advanceWidth / font.unitsPerEm) * fontSize;
    return advance + characterSpacing * Math.max(0, text.length - 1);
}

/**
 * Largest size from `ladder` at which `text` fits `maxWidth` on one line.
 *
 * The metric tiles are only ~98pt wide, so a value cannot simply render at the reference's 28px: "194,827"
 * fits at 20pt, "1,284,930" does not, and a non-numeric state like "Not tracked" overflows at every size in
 * that range. Because each tile's rounded background is a fixed-height canvas rect, an over-long value would
 * wrap straight out through the bottom of its own border — so it is scaled down to fit instead.
 */
function fitValueFontSize(text: string, maxWidth: number, ladder: number[] = [20, 18, 16, 14, 12, 10, 9]): number {
    const fits = ladder.find((size) => measureText(text, size, { bold: true }) <= maxWidth);
    return fits ?? ladder[ladder.length - 1];
}

/** Width a single-line pill needs to hold `text` without wrapping, including its horizontal padding. */
function pillWidth(text: string, fontSize: number, padX: number): number {
    return Math.ceil(measureText(text, fontSize) + padX * 2) + 1;
}

/**
 * Height of one line of text at `fontSize`.
 *
 * All four bundled Roboto faces report ascent 1900, descent -500, lineGap 0 over 2048 units/em, so a line
 * occupies `fontSize * 2400/2048`. This is what pdfkit's `currentLineHeight()` returns.
 */
const LINE_HEIGHT_RATIO = 2400 / 2048;

function lineHeight(fontSize: number): number {
    return fontSize * LINE_HEIGHT_RATIO;
}

/**
 * Number of lines `text` wraps to inside `maxWidth`, mirroring pdfmake's greedy whitespace wrapping.
 *
 * Lets a fixed-height rounded panel be sized from the content that will actually go in it, instead of a
 * constant that silently under-reserves the moment a string gets longer than the one it was tuned against.
 */
function wrappedLineCount(text: string, fontSize: number, maxWidth: number, bold = false): number {
    let lines = 1;
    let current = '';
    for (const word of text.split(/\s+/)) {
        const candidate = current ? `${current} ${word}` : word;
        if (!current || measureText(candidate, fontSize, { bold }) <= maxWidth) {
            current = candidate;
        } else {
            // A word wider than the column can't be placed on one line — pdfkit breaks it mid-word, so
            // account for every line it occupies. Without this a single long unbroken token (a DID, a
            // hyphenated compound) under-reserves the panel and the content spills past its border.
            lines += Math.ceil(measureText(word, fontSize, { bold }) / maxWidth);
            current = word;
        }
    }
    return lines;
}

/**
 * Rounded, optionally-bordered panel with `content` laid over it.
 *
 * pdfmake has no rounded container: table borders are always straight rules, and a `canvas` rect is the only
 * node that accepts a corner radius. So the panel is drawn as a canvas rect that occupies `h` points of
 * layout flow, then the content is pulled back over it with a negative top margin.
 *
 * `h` must therefore be known up front, and content taller than `h` spills past the border rather than
 * growing it — hence `fitValueFontSize`/`pillWidth` above, and why the variable-length table cards keep
 * using bordered tables instead of this.
 */
function roundedPanel(
    content: Content,
    w: number,
    h: number,
    opts: { r?: number; fill?: string; stroke?: string | null; padX?: number; padY?: number } = {},
): Content {
    const { r = RADIUS.card, fill = COLORS.cardBg, stroke = COLORS.border, padX = 10, padY = 9 } = opts;
    // `width` is meaningful when this panel sits in a `columns` array, but pdfmake's TS types don't declare it
    // on a stack node, so the composed object is asserted rather than fought with.
    return {
        width: w,
        stack: [
            {
                canvas: [
                    {
                        type: 'rect',
                        x: 0,
                        y: 0,
                        w,
                        h,
                        r,
                        color: fill,
                        ...(stroke ? { lineColor: stroke, lineWidth: 0.5 } : {}),
                    },
                ],
            },
            { ...(content as object), margin: [padX, -h + padY, padX, 0] as Margins },
        ],
    } as unknown as Content;
}

// ─────────────────────────────────────────────────────────────────────────
// Params
// ─────────────────────────────────────────────────────────────────────────

/**
 * Scope filters the report was generated for (Reporting Period / Registry Filter selects). Both are display
 * labels only (already resolved by the caller); this module does no filtering itself. Undefined fields fall
 * back to the "full portfolio" defaults.
 */
export interface ImpactSummaryReportScope {
    /** e.g. "Evercity" or "TolamEarth". Defaults to "All registries". */
    registryLabel?: string;
    /** e.g. "2025" or "Q1 2026". Defaults to "All time". */
    periodLabel?: string;
}

/**
 * Display identity for the closing "Generated by" block. Resolved by the caller (`ImpactSummaryService`) from
 * the authenticated user — this module stays decoupled from `@api/auth/auth.types` and only renders what it is
 * given. `name` is commonly unavailable, so render "--" rather than inventing one.
 */
export interface ImpactSummaryGeneratedBy {
    name?: string | null;
    email?: string | null;
}

export interface ImpactSummaryPdfParams {
    /** The Impact Summary aggregate (already deduped by relatedTopicId/registryDid — see impact-summary.repository.ts). */
    summary: ImpactSummaryResponseDto;
    network: string;
    /** `SA-RPT-{yyyy}-{mmdd}-{seq}` — see report-id.ts. */
    reportId: string;
    scope?: ImpactSummaryReportScope;
    /**
     * Document-generation instant. Passed explicitly (not defaulted to
     * `new Date()` internally) so the header/footer timestamps, the "Data
     * synced" badge, and the caller's `reportId` all agree on the same
     * instant.
     */
    generatedAt: Date;
    /** "Generated by" attribution. Omit to render "--" / "--". */
    generatedBy?: ImpactSummaryGeneratedBy;
}

// ─────────────────────────────────────────────────────────────────────────
// Formatting helpers (exported for reuse by the data-section tables/cards)
// ─────────────────────────────────────────────────────────────────────────

/** `mainnet` -> `Hedera Mainnet` (matches the mockup's "Hedera Mainnet" wording). */
export function networkLabel(network: string): string {
    if (!network) return 'Hedera';
    return `Hedera ${network.charAt(0).toUpperCase()}${network.slice(1)}`;
}

/** `194827` -> `"194,827"`. Rounds to the nearest whole credit (tCO2e are reported as integers throughout the app). */
export function formatNumber(value: number): string {
    return Math.round(value).toLocaleString('en-US');
}

/** `"July 3, 2026"` — used in the running header and the "Data synced" badge. UTC so the label never depends on server TZ. */
export function formatLongDate(date: Date): string {
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

/** `"Jul 3, 2026"` — used in badges. UTC, see formatLongDate. */
export function formatShortDate(date: Date): string {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

/** `"Jul 3, 2026, 05:02 PM"` — footer "Generated" timestamp. UTC, see formatLongDate. */
export function formatShortDateTime(date: Date): string {
    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: 'UTC',
    });
}

// ─────────────────────────────────────────────────────────────────────────
// Page background wash (approximates the reference design's cream page background)
// ─────────────────────────────────────────────────────────────────────────

function buildPageBackground(): () => Content {
    return () => ({
        canvas: [{ type: 'rect', x: 0, y: 0, w: A4_WIDTH, h: A4_HEIGHT, color: COLORS.pageBg }],
    });
}

// ─────────────────────────────────────────────────────────────────────────
// Running header / footer
// ─────────────────────────────────────────────────────────────────────────

/** Rendered width of the logo lockup. Height follows from the asset's own aspect ratio so it never stretches. */
const LOGO_WIDTH = 132;

/**
 * Page header.
 *
 * Page 1 carries the full logo lockup, mirroring the reference design, which shows the brand once at the top
 * of a single continuous page. Later pages get a slim text-only bar instead: repeating a 132pt image on every
 * page would both crowd the running header and re-embed nothing useful, while still leaving each detached
 * printed page identifiable.
 */
function buildHeader(network: string, generatedAt: Date): (currentPage: number, pageCount: number) => Content {
    return (currentPage) => {
        if (currentPage > 1) {
            return {
                margin: [PAGE_MARGIN_X, 28, PAGE_MARGIN_X, 0],
                stack: [
                    {
                        columns: [
                            { text: 'ESG Impact Summary Report', fontSize: 8.5, color: COLORS.muted },
                            {
                                text: `${networkLabel(network)} · Confidential`,
                                fontSize: 8.5,
                                color: COLORS.mutedLight,
                                alignment: 'right',
                            },
                        ],
                        margin: [0, 0, 0, 6],
                    },
                    {
                        canvas: [
                            { type: 'line', x1: 0, y1: 0, x2: CONTENT_WIDTH, y2: 0, lineWidth: 0.5, lineColor: COLORS.border },
                        ],
                    },
                ],
            };
        }

        return {
            margin: [PAGE_MARGIN_X, 22, PAGE_MARGIN_X, 0],
            stack: [
                {
                    columns: [
                        { image: SA_LOGO_DATA_URI, width: LOGO_WIDTH },
                        {
                            text: [
                                { text: `${networkLabel(network)} · `, color: COLORS.muted, fontSize: 8.5 },
                                { text: 'Verified', color: COLORS.green, fontSize: 8.5, bold: true },
                            ],
                            alignment: 'right',
                            margin: [0, 10, 0, 0],
                        },
                    ],
                },
                {
                    text: `ESG Impact Summary Report · ${formatLongDate(generatedAt)} · Confidential`,
                    fontSize: 8.5,
                    color: COLORS.muted,
                    margin: [0, 4, 0, 7],
                },
                {
                    canvas: [
                        { type: 'line', x1: 0, y1: 0, x2: CONTENT_WIDTH, y2: 0, lineWidth: 0.5, lineColor: COLORS.border },
                    ],
                },
            ],
        };
    };
}

function buildFooter(generatedAt: Date): (currentPage: number, pageCount: number) => Content {
    return (currentPage, pageCount) => ({
        margin: [40, 8, 40, 0],
        stack: [
            {
                canvas: [
                    { type: 'line', x1: 0, y1: 0, x2: CONTENT_WIDTH, y2: 0, lineWidth: 0.5, lineColor: COLORS.border },
                ],
            },
            {
                columns: [
                    {
                        width: '*',
                        stack: [
                            {
                                text: 'Data sourced from Hedera Guardian on-chain records. All credits verifiable via HashScan.',
                                style: 'footerNote',
                            },
                            {
                                text: `se.xeptagon.com · Generated ${formatShortDateTime(generatedAt)}`,
                                style: 'footerNote',
                                margin: [0, 1, 0, 0],
                            },
                        ],
                    },
                    { width: 80, text: `Page ${currentPage} of ${pageCount}`, style: 'footerNote', alignment: 'right' },
                ],
                margin: [0, 4, 0, 0],
            },
        ],
    });
}

// ─────────────────────────────────────────────────────────────────────────
// Title block + badge row + Report ID/Network metadata
// ─────────────────────────────────────────────────────────────────────────

function buildTitleBlock(network: string, scope: ImpactSummaryReportScope | undefined): Content[] {
    const registryLabel = scope?.registryLabel ?? 'All registries';
    const periodLabel = scope?.periodLabel ?? 'All time';

    return [
        { text: 'ESG IMPACT SUMMARY REPORT', style: 'eyebrow' },
        { text: 'Carbon Credit Portfolio Overview', style: 'h1' },
        {
            text: `Full portfolio · ${registryLabel} · ${periodLabel} · ${networkLabel(network)}`,
            style: 'subtitle',
        },
    ];
}

/** Pill geometry. `r = h/2` gives the reference's fully-rounded `border-radius: 999px` ends. */
const BADGE_FONT_SIZE = 9;
const BADGE_HEIGHT = 18;
const BADGE_PAD_X = 9;
/** Centres a single 9pt line in BADGE_HEIGHT: pdfmake puts the baseline ~0.92em below the top inset. */
const BADGE_PAD_Y = 4;

/**
 * One pill badge.
 *
 * Width has to be stated up front because the rounded background is a canvas rect, and pdfmake offers no way
 * to measure text while the document definition is still being built — so it is estimated from the string
 * length via `pillWidth()`. The estimate is deliberately generous; a pill slightly wider than its text is
 * invisible, whereas one that is too narrow wraps the text out of its own background.
 */
function badge(text: string, fg: string, bg: string, border?: string): Content {
    return roundedPanel(
        { text, style: 'badgeText', color: fg },
        pillWidth(text, BADGE_FONT_SIZE, BADGE_PAD_X),
        BADGE_HEIGHT,
        {
            r: BADGE_HEIGHT / 2,
            fill: bg,
            stroke: border ?? null,
            padX: BADGE_PAD_X,
            padY: BADGE_PAD_Y,
        },
    );
}

/** Gap between pills in the badge row. */
const BADGE_GAP = 6;

/**
 * Badge row (Blockchain-Verified / N Registries / N Methodologies / Data synced), then the Report ID / Network
 * metadata on its own line beneath it — the arrangement the reference design uses.
 *
 * The meta block deliberately does not share a row with the pills: the four pills need ~400pt once measured,
 * which does not fit beside a 170pt metadata column inside a 515pt content width, and pdfmake would let the
 * two collide rather than reflow.
 *
 * Registry/methodology counts come straight from the aggregate, which is already deduped, so no further dedup
 * is needed here. "Data synced" has no dedicated sync-watermark field, so this uses the report's own
 * `generatedAt` as the best available proxy.
 */
function buildBadgeRowAndMeta(summary: ImpactSummaryResponseDto, reportId: string, network: string, generatedAt: Date): Content {
    return {
        stack: [
            {
                columns: [
                    badge('Blockchain-Verified', COLORS.greenDark, COLORS.greenTint),
                    badge(`${summary.registryBreakdown.length} Registries`, COLORS.muted, COLORS.neutralBadgeBg, COLORS.border),
                    badge(`${summary.methodologyCount} Methodologies`, COLORS.muted, COLORS.neutralBadgeBg, COLORS.border),
                    badge(`Data synced: ${formatShortDate(generatedAt)}`, COLORS.muted, COLORS.neutralBadgeBg, COLORS.border),
                    // Soaks up the remaining width so the pills keep their measured sizes instead of stretching.
                    { text: '', width: '*' },
                ],
                columnGap: BADGE_GAP,
            },
            {
                columns: [
                    { text: [{ text: 'Report ID  ', style: 'metaLabel' }, { text: reportId, style: 'metaValue' }], width: 'auto' },
                    {
                        text: [{ text: 'Network  ', style: 'metaLabel' }, { text: networkLabel(network), style: 'metaValue' }],
                        width: 'auto',
                    },
                ],
                columnGap: 18,
                margin: [0, 10, 0, 0],
            },
        ],
        margin: [0, 14, 0, 0],
    };
}

// ─────────────────────────────────────────────────────────────────────────
// Key Portfolio Metrics (5 stat cards)
// ─────────────────────────────────────────────────────────────────────────

/** Metric-tile geometry: 5 tiles spanning the content width, sized off it so nothing is hardcoded. */
const METRIC_GAP = 6;
const METRIC_COUNT = 5;
const METRIC_WIDTH = (CONTENT_WIDTH - METRIC_GAP * (METRIC_COUNT - 1)) / METRIC_COUNT;
const METRIC_PAD_X = 10;
const METRIC_PAD_Y = 9;
/** Fits label (8.5pt) + value (<=20pt) + optional sublabel (7pt) plus vertical padding, with headroom. */
const METRIC_HEIGHT = 66;
const METRIC_INNER_WIDTH = METRIC_WIDTH - METRIC_PAD_X * 2;

/**
 * One metric tile: rounded, hairline-bordered, white on the cream page.
 *
 * The value's font size is chosen per value rather than fixed. These tiles are only ~98pt wide, so the
 * reference's 28px display size only actually fits short numbers — "194,827" fits at 20pt, "1,234,567" does
 * not, and a non-numeric state like "Not tracked" overflows at every size in that range. Since the panel's
 * rounded background is a fixed-height canvas rect, an over-long value would wrap straight out the bottom of
 * its own border, so it is scaled down to fit instead.
 */
function metricCard(value: string, label: string, sublabel: string): Content {
    const valueFontSize = fitValueFontSize(value, METRIC_INNER_WIDTH);
    return roundedPanel(
        {
            stack: [
                { text: label, style: 'metricLabel' },
                { text: value, style: 'metricValue', fontSize: valueFontSize, margin: [0, 3, 0, 0] as Margins },
                // Only emit the sublabel when there is one — an empty text node still reserves a line box.
                ...(sublabel ? [{ text: sublabel, style: 'metricSublabel', margin: [0, 2, 0, 0] as Margins }] : []),
            ],
        },
        METRIC_WIDTH,
        METRIC_HEIGHT,
        { padX: METRIC_PAD_X, padY: METRIC_PAD_Y },
    );
}

/** `metricSublabel`'s size, needed here to measure a sublabel before committing to it. Keep in sync with PDF_STYLES. */
const METRIC_SUBLABEL_FONT_SIZE = 7;

/**
 * "Active Projects" sublabel, derived from the real lifecycle-stage breakdown (`mv_project_lifecycle`)
 * rather than the fixed "Verified · Issuing" caption this replaced — that caption named two stages
 * unconditionally, whether or not any project was at either of them. The full stage breakdown is rendered
 * by `buildLifecycleCard()`; this tile only carries the headline "how many of them actually issued".
 */
function activeProjectsSublabel(summary: ImpactSummaryResponseDto): string {
    const issued = summary.lifecycleStages.find((s) => s.stage === 'Issued')?.projectCount ?? 0;
    const full = `${formatNumber(issued)} of ${formatNumber(summary.activeProjects)} issued`;
    // The tile's background is a fixed-height canvas rect, so a sublabel that wraps escapes its own border
    // (same hazard as the "Total Transfer" caption below). Drop to the short form rather than let that happen.
    return measureText(full, METRIC_SUBLABEL_FONT_SIZE) <= METRIC_INNER_WIDTH
        ? full
        : `${formatNumber(issued)} issued`;
}

/**
 * 5 tiles matching the reference design's Key Portfolio Metrics row. Item-7 fix: "Total Retired" no
 * longer carries the "(inferred)" qualifier in its label — the inference methodology is still fully
 * explained in the Limitations note (see buildDisclosureNotesSection) so the report doesn't go silent
 * about how the figure is derived, it just doesn't tag every occurrence of the number itself.
 *
 * "Total Transfer" has no backing data anywhere in this system — transfers leave no on-chain Guardian
 * marker and tracking them was explicitly deferred — so it renders an honest "Not tracked" state rather
 * than a fabricated number.
 */
function buildMetricCards(summary: ImpactSummaryResponseDto): Content {
    return {
        columns: [
            metricCard(formatNumber(summary.totalCreditsIssued), 'Total Credits Issued', 'tCO2e issued on-chain'),
            metricCard(formatNumber(summary.activeSupplyInferred), 'Active Supply', 'Credits in circulation'),
            metricCard(formatNumber(summary.totalRetiredInferred), 'Total Retired', 'Permanently retired'),
            // Sublabel kept short deliberately: "No on-chain transfer record" measures 85pt against the
            // tile's 78pt inner width and wraps out of the tile's fixed-height rounded panel.
            metricCard('Not tracked', 'Total Transfer', 'No transfer record'),
            metricCard(formatNumber(summary.activeProjects), 'Active Projects', activeProjectsSublabel(summary)),
        ],
        columnGap: METRIC_GAP,
        margin: [0, 16, 0, 0],
    };
}

// ─────────────────────────────────────────────────────────────────────────
// Data sections — shared layout helpers
// ─────────────────────────────────────────────────────────────────────────

/** Splits an array into fixed-size chunks (used to lay out the SDG card grid in rows). */
function chunk<T>(arr: T[], size: number): T[][] {
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
}

/** `"did:hedera:mainnet:34VqT5em9k..."` — truncates a long DID for a table cell / footer caption. `null`/`undefined` renders "--". */
function truncateDid(did: string | null | undefined, visibleChars = 22): string {
    if (!did) return '--';
    if (did.length <= visibleChars + 3) return did;
    return `${did.slice(0, visibleChars)}...`;
}

/** Must match the `didValue` style's fontSize — used to measure the DID before laying it out. */
const DID_FONT_SIZE = 8;

/**
 * Wraps a long unbroken identifier so it stays fully visible inside `maxWidth`.
 *
 * pdfmake cannot break a DID on its own: `did:hedera:testnet:...` contains no spaces, and under the Unicode
 * line-breaking rules its `:` `;` `.` separators are all infix separators, which are explicitly *not* break
 * opportunities. Left alone, a long DID renders as one line that runs straight out of its cell — so the break
 * points are inserted here, after each separator, with a hard character cut as the last resort for a run that
 * has no separators at all. Only newlines are added; no character of the original is dropped or replaced.
 */
function wrapIdentifier(value: string, maxWidth: number, fontSize: number): string {
    const chunks = value.match(/[^:;_.]*[:;_.]?/g)?.filter((c) => c.length > 0) ?? [value];
    const lines: string[] = [];
    let line = '';

    const flushOverflow = () => {
        while (measureText(line, fontSize) > maxWidth && line.length > 1) {
            let cut = line.length - 1;
            while (cut > 1 && measureText(line.slice(0, cut), fontSize) > maxWidth) cut--;
            lines.push(line.slice(0, cut));
            line = line.slice(cut);
        }
    };

    for (const chunk of chunks) {
        if (line && measureText(line + chunk, fontSize) > maxWidth) {
            lines.push(line);
            line = chunk;
        } else {
            line += chunk;
        }
        flushOverflow();
    }
    if (line) lines.push(line);

    return lines.join('\n');
}

/**
 * Picks one representative registry DID for the "Registry DID" captions: the scope's named registry if it
 * matches a row in `registryBreakdown`, else the first row that has a DID, else `null`. Never fabricates a DID.
 */
function pickRegistryDid(summary: ImpactSummaryResponseDto, scope: ImpactSummaryReportScope | undefined): string | null {
    if (scope?.registryLabel) {
        const match = summary.registryBreakdown.find((r) => r.displayName === scope.registryLabel && r.registryDid);
        if (match) return match.registryDid;
    }
    return summary.registryBreakdown.find((r) => r.registryDid)?.registryDid ?? null;
}

/** Section heading, matching the report's H2-style headings. */
function sectionHeader(text: string): Content {
    return { text, style: 'sectionHeader' };
}

/** Shaded, bordered content card — same table-cell trick as `metricCard()`/`badge()` above, restyled with a hairline border to match the reference design's white bordered cards. `margin` is only needed where two cards sit under one section heading and would otherwise share an edge; every other card is separated by its `sectionHeader`'s own margin. */
function card(content: Content[], margin?: Margins): Content {
    return {
        ...(margin ? { margin } : {}),
        table: {
            widths: ['*'],
            body: [
                [
                    {
                        stack: content,
                        fillColor: COLORS.cardBg,
                        border: [true, true, true, true],
                        margin: [12, 12, 12, 12],
                    } as any,
                ],
            ],
        },
        layout: {
            hLineWidth: () => 0.5,
            vLineWidth: () => 0.5,
            hLineColor: () => COLORS.border,
            vLineColor: () => COLORS.border,
            // Zeroed out for the same reason as metricCard()'s layout above — the cell's own `margin`
            // already provides the inner spacing every table-width budget in this file assumes.
            paddingLeft: () => 0,
            paddingRight: () => 0,
            paddingTop: () => 0,
            paddingBottom: () => 0,
        },
    };
}

// ─────────────────────────────────────────────────────────────────────────
// Data-table geometry
// ─────────────────────────────────────────────────────────────────────────

/**
 * Inner padding of `card()`, and therefore the width budget anything nested inside one has to live within.
 *
 * The extra 1pt accounts for the card table's own left+right `vLineWidth` (0.5pt each). Omitting it pushed
 * every card background 0.75pt past the right margin — invisible on paper, but it meant the margin check
 * only passed because its tolerance happened to be the same size as the error.
 */
const CARD_PAD = 12;
const CARD_BORDER_WIDTH = 1;
const CARD_INNER_WIDTH = CONTENT_WIDTH - CARD_PAD * 2 - CARD_BORDER_WIDTH;

/** Horizontal padding applied at each interior column boundary by `DATA_TABLE_LAYOUT` below. */
const CELL_PAD_X = 6;

/**
 * Row-ruled table layout for the data sections.
 *
 * Replaces pdfmake's built-in `lightHorizontalLines`, which hardcodes a black rule under the header row and
 * `#aaa` between rows — nothing like the reference's warm hairlines — and pads 8pt on both sides of every
 * interior boundary (16pt per boundary, so 96pt of a 7-column table's width before a single cell is drawn).
 */
const DATA_TABLE_LAYOUT: CustomTableLayout = {
    hLineWidth: (i, node) => (i === 0 || i === node.table.body.length ? 0 : 0.5),
    vLineWidth: () => 0,
    hLineColor: () => COLORS.border,
    paddingLeft: (i) => (i === 0 ? 0 : CELL_PAD_X),
    paddingRight: (i, node) => {
        const columnCount = Array.isArray(node.table.widths) ? node.table.widths.length : 0;
        return i === columnCount - 1 ? 0 : CELL_PAD_X;
    },
    paddingTop: () => 4,
    paddingBottom: () => 4,
};

/**
 * Column widths that are guaranteed to fit inside a `card()`, distributed by relative weight.
 *
 * pdfmake does not shrink a table to fit its container: `columnCalculator` forces the containing star column
 * up to the table's own minimum width instead, so fixed pixel widths that overrun silently push the card off
 * the right-hand side of the page. Deriving every width from `CARD_INNER_WIDTH` minus the layout's real
 * padding makes that structurally impossible — and means changing a font size or a column can no longer put
 * the table over budget by accident.
 */
function tableWidths(weights: number[]): number[] {
    const padding = CELL_PAD_X * 2 * (weights.length - 1);
    const available = CARD_INNER_WIDTH - padding;
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    return weights.map((w) => (w / totalWeight) * available);
}

/** Bars span the full inner width of their card, derived so card padding changes can't make them overflow. */
const BAR_WIDTH = CARD_INNER_WIDTH;
const BAR_HEIGHT = 8;

/** One horizontal bar row: `label | value` above a full-width `▇▇▇▇▇____` bar — matches the reference design's wide single-column bar rows (Credits by Sector / Geographic Distribution). */
function barRow(label: string, percentage: number, valueLabel: string, color: string): Content {
    const filled = percentage > 0 ? Math.max(3, (percentage / 100) * BAR_WIDTH) : 0;
    return {
        stack: [
            {
                columns: [
                    { width: '*', text: label, style: 'barLabel', bold: true },
                    { width: 'auto', text: valueLabel, style: 'barValue', alignment: 'right' },
                ],
                margin: [0, 0, 0, 4],
            },
            {
                canvas: [
                    { type: 'rect', x: 0, y: 1, w: BAR_WIDTH, h: BAR_HEIGHT, color: COLORS.tableHeadBg },
                    { type: 'rect', x: 0, y: 1, w: filled, h: BAR_HEIGHT, color },
                ],
            },
        ],
        margin: [0, 0, 0, 12],
    };
}

function tableHeaderCell(text: string, alignment: 'left' | 'center' | 'right' = 'left'): Content {
    return { text: text.toUpperCase(), style: 'tableHeaderText', alignment, fillColor: COLORS.tableHeadBg, margin: [0, 5, 0, 5] };
}

function tableCell(text: string, alignment: 'left' | 'center' | 'right' = 'left'): Content {
    return { text, style: 'tableCellText', alignment };
}

// ─────────────────────────────────────────────────────────────────────────
// Project Lifecycle
// ─────────────────────────────────────────────────────────────────────────

/**
 * Colour ramp along the pipeline, palest at 'Registered' and strongest at 'Issued', so the bar block reads
 * as a progression rather than as unrelated categories. Indexed by the stage's position in the DTO's
 * pipeline-ordered array, not by stage name, so an extra trailing bucket ('Unclassified') still gets a colour.
 */
const LIFECYCLE_COLORS = [COLORS.mutedLight, COLORS.muted, COLORS.amber, COLORS.green, COLORS.greenDark];

/**
 * Projects per derived lifecycle stage, rendered under the existing "Credit Lifecycle & Sector Breakdown"
 * heading — which named a lifecycle but, until this card, carried only the sector bars.
 *
 * Source is `mv_project_lifecycle` via `summary.lifecycleStages`, the same precomputed classification the
 * Projects page filters on, so the two can't disagree. Stages with no projects are already dropped upstream
 * (`buildLifecycleStages`), so an early-stage-only portfolio doesn't render a column of zeroes.
 */
function buildLifecycleCard(summary: ImpactSummaryResponseDto): Content {
    const rows = summary.lifecycleStages;
    return card([
        { text: 'Projects by Lifecycle Stage', style: 'cardTitle' },
        ...(rows.length > 0
            ? rows.map((s, i) =>
                barRow(
                    s.stage,
                    s.percentage,
                    `${formatNumber(s.projectCount)} ${s.projectCount === 1 ? 'project' : 'projects'} · ${s.percentage}%`,
                    LIFECYCLE_COLORS[i % LIFECYCLE_COLORS.length],
                ),
            )
            : [{ text: 'No project lifecycle data available.', style: 'footerNote' }]),
        {
            text:
                'Stage is derived from the verification documents each project has actually submitted on-chain ' +
                '(Registered -> Validation -> Monitoring -> Verified -> Issued), not from a self-declared status field.',
            style: 'noteText',
        },
    ], [0, 0, 0, 12]);
}

// ─────────────────────────────────────────────────────────────────────────
// Credits by Sector
// ─────────────────────────────────────────────────────────────────────────

/** Horizontal bar rows per sector, including the explicit 'Unknown'/'Others' buckets already built by `buildSectorBreakdown()` (impact-summary.dto.ts). Rendered under the "Credit Lifecycle & Sector Breakdown" heading as a single card — the reference design's own source only carries the sector-bars card under that heading, so no separate active/retired lifecycle bar is rendered here (retirement is still fully visible via the "Total Retired" metric tile and the Limitations note). */
function buildSectorCard(summary: ImpactSummaryResponseDto): Content {
    const rows = summary.sectorBreakdown;
    return card([
        { text: 'Credits by Sector', style: 'cardTitle' },
        ...(rows.length > 0
            ? rows.map((s, i) => barRow(s.sector, s.percentage, `${s.percentage}% · ${formatNumber(s.creditsIssued)} tCO2e`, SECTOR_COLORS[i % SECTOR_COLORS.length]))
            : [{ text: 'No sector data available.', style: 'footerNote' }]),
    ]);
}

// ─────────────────────────────────────────────────────────────────────────
// Geographic Distribution
// ─────────────────────────────────────────────────────────────────────────

const GEO_TOP_N = 8;

function buildGeoCard(summary: ImpactSummaryResponseDto): Content {
    const total = summary.geographicDistribution.length;
    const rows = summary.geographicDistribution.slice(0, GEO_TOP_N);
    // Only claim a top-N slice when one was actually taken: with 6 countries in the data this used to
    // read "top 8 of 6 countries", which describes a truncation that never happened.
    const caption =
        total > GEO_TOP_N
            ? `Ranked by tCO2e · top ${GEO_TOP_N} of ${total} countries`
            : `Ranked by tCO2e · all ${total} ${total === 1 ? 'country' : 'countries'}`;
    return card([
        { text: 'Geographic Distribution', style: 'cardTitle' },
        { text: caption, style: 'footerNote', margin: [0, 0, 0, 10] },
        ...(rows.length > 0
            ? rows.map((g) => barRow(g.country, g.percentage, `${formatNumber(g.creditsIssued)} tCO2e`, COLORS.greenDark))
            : [{ text: 'No geographic data available.', style: 'footerNote' }]),
        {
            text: `${summary.activeCountries} countries · ${summary.activeProjects} active projects`,
            style: 'footerNote',
            margin: [0, 4, 0, 0],
        },
    ]);
}

// ─────────────────────────────────────────────────────────────────────────
// Credits by Registry
// ─────────────────────────────────────────────────────────────────────────

/**
 * Registry, Registry ID, Projects, Issuances, Credits tCO2e — only registries with recorded activity
 * (≥1 project or ≥1 issuance) are listed; the aggregate itself still carries every registry on file
 * (including zero-activity ones), so a footnote reports how many are hidden rather than dumping the
 * full (often mostly-empty) registry catalogue into the report, matching the reference design.
 */
function buildRegistryTable(summary: ImpactSummaryResponseDto): Content {
    const all = summary.registryBreakdown;
    const active = all.filter((r) => r.projectCount > 0 || r.issuanceCount > 0);
    const hidden = all.length - active.length;

    const body: Content[][] = [
        [
            tableHeaderCell('Registry'),
            tableHeaderCell('Registry ID'),
            tableHeaderCell('Projects', 'center'),
            tableHeaderCell('Issuances', 'right'),
            tableHeaderCell('Credits tCO2e', 'right'),
        ],
        ...active.map((r) => [
            tableCell(r.displayName ?? '--'),
            tableCell(truncateDid(r.registryDid)),
            tableCell(String(r.projectCount), 'center'),
            tableCell(String(r.issuanceCount), 'right'),
            tableCell(formatNumber(r.creditsIssued), 'right'),
        ]),
    ];

    return card([
        { text: 'Credits by Registry', style: 'cardTitle' },
        { text: 'Registries with recorded activity', style: 'footerNote', margin: [0, 0, 0, 10] },
        active.length > 0
            ? { table: { headerRows: 1, widths: tableWidths([28, 26, 12, 14, 20]), body }, layout: DATA_TABLE_LAYOUT }
            : { text: 'No registry data available.', style: 'footerNote' },
        {
            text:
                hidden > 0
                    ? `${hidden} additional registries on file recorded 0 projects and 0 issuances this period, and are hidden from this view. Full dataset available in CSV/Excel export.`
                    : 'Full dataset available in CSV/Excel export.',
            style: 'noteText',
        },
    ]);
}

// ─────────────────────────────────────────────────────────────────────────
// Credits by Methodology
// ─────────────────────────────────────────────────────────────────────────

/** Methodology, Methodology ID, Registry, Version, Projects, Issuances, Credits — a top-10 sample by project/issuance activity (see `getMethodologyBreakdown()`), not the full methodology list. */
function buildMethodologyTable(summary: ImpactSummaryResponseDto): Content {
    const rows = summary.methodologyBreakdown;
    const body: Content[][] = [
        [
            tableHeaderCell('Methodology'),
            tableHeaderCell('Methodology ID'),
            tableHeaderCell('Registry'),
            tableHeaderCell('Version'),
            tableHeaderCell('Projects', 'center'),
            tableHeaderCell('Issuances', 'right'),
            tableHeaderCell('Credits', 'right'),
        ],
        ...rows.map((m) => [
            tableCell(m.name ?? '--'),
            tableCell(truncateDid(m.methodologyId, 14)),
            tableCell(m.registryName ?? '--'),
            tableCell(m.version ?? '--'),
            tableCell(String(m.projectCount), 'center'),
            tableCell(String(m.issuanceCount), 'right'),
            tableCell(formatNumber(m.creditsIssued), 'right'),
        ]),
    ];

    return card([
        { text: 'Credits by Methodology', style: 'cardTitle' },
        { text: `${summary.methodologyCount} total methodologies · sample of ${rows.length} shown`, style: 'footerNote', margin: [0, 0, 0, 10] },
        rows.length > 0
            ? { table: { headerRows: 1, widths: tableWidths([26, 18, 16, 9, 10, 10, 11]), body }, layout: DATA_TABLE_LAYOUT }
            : { text: 'No methodology data available.', style: 'footerNote' },
        {
            text: `Showing a sample from the source system, not the full ${summary.methodologyCount}-row export. Full list available via CSV/Excel export.`,
            style: 'noteText',
        },
    ]);
}

// ─────────────────────────────────────────────────────────────────────────
// Credits by Project
// ─────────────────────────────────────────────────────────────────────────

/** Project, Country, Methodology, Status, Registry, Issuances, Credits — a top-12 sample by credits issued descending (see `getProjectBreakdown()`), not the full project list. `Status` is the raw `businessData.status` field, not the fuller derived lifecycle-stage logic used on the Projects page. */
function buildProjectTable(summary: ImpactSummaryResponseDto): Content {
    const rows = summary.projectBreakdown;
    const body: Content[][] = [
        [
            tableHeaderCell('Project'),
            tableHeaderCell('Country'),
            tableHeaderCell('Methodology'),
            tableHeaderCell('Status'),
            tableHeaderCell('Registry'),
            tableHeaderCell('Issuances', 'right'),
            tableHeaderCell('Credits', 'right'),
        ],
        ...rows.map((p) => [
            tableCell(p.name ?? '--'),
            tableCell(p.country),
            tableCell(p.methodology ?? '--'),
            tableCell(p.status ?? '--'),
            tableCell(p.registryName ?? '--'),
            tableCell(String(p.issuanceCount), 'right'),
            tableCell(formatNumber(p.creditsIssued), 'right'),
        ]),
    ];

    return card([
        { text: 'Credits by Project', style: 'cardTitle' },
        { text: `${summary.activeProjects} total projects · sample of ${rows.length} shown`, style: 'footerNote', margin: [0, 0, 0, 10] },
        rows.length > 0
            ? { table: { headerRows: 1, widths: tableWidths([22, 13, 17, 15, 13, 10, 10]), body }, layout: DATA_TABLE_LAYOUT }
            : { text: 'No project data available.', style: 'footerNote' },
        {
            text: `Showing a sample from the source system, not the full ${summary.activeProjects}-project export. Full list available via CSV/Excel export.`,
            style: 'noteText',
        },
    ]);
}

// ─────────────────────────────────────────────────────────────────────────
// SDG Contributions
// ─────────────────────────────────────────────────────────────────────────

/** 4 per row, matching the reference design's SDG chip grid. */
const SDG_CARDS_PER_ROW = 4;

/** SDG chip geometry — 4 across the inner width of the enclosing card. */
const SDG_GAP = 8;
const SDG_CHIP_WIDTH = (CARD_INNER_WIDTH - SDG_GAP * (SDG_CARDS_PER_ROW - 1)) / SDG_CARDS_PER_ROW;
const SDG_PAD_X = 8;
const SDG_PAD_Y = 7;
const SDG_BADGE_SIZE = 18;
const SDG_BADGE_GAP = 6;
const SDG_NAME_FONT_SIZE = 8;
const SDG_COUNT_FONT_SIZE = 7.5;
/** Width left for the goal name once the badge and padding are taken out. */
const SDG_NAME_WIDTH = SDG_CHIP_WIDTH - SDG_PAD_X * 2 - SDG_BADGE_SIZE - SDG_BADGE_GAP;

/**
 * Height a row of chips needs, driven by the longest goal name in that row.
 *
 * Measured rather than fixed: a constant tuned against one set of names under-reserves as soon as a longer
 * one appears, and the name then wraps straight out through the bottom of the chip's own border. Every chip
 * in a row shares the row's height so the grid stays even.
 */
function sdgRowHeight(row: ImpactSummaryResponseDto['sdgContributions']): number {
    const maxLines = Math.max(
        ...row.map((s) => wrappedLineCount(s.name, SDG_NAME_FONT_SIZE, SDG_NAME_WIDTH, true)),
    );
    const nameHeight = maxLines * lineHeight(SDG_NAME_FONT_SIZE);
    // Two count lines (projects, then issuances) — each carries its own 1pt top margin.
    const countHeight = SDG_COUNT_LINES * (1 + lineHeight(SDG_COUNT_FONT_SIZE));
    return Math.ceil(SDG_PAD_Y * 2 + nameHeight + countHeight);
}

/** Count lines rendered under each goal name. Must match the number of lines `sdgCard()` emits, or chips clip. */
const SDG_COUNT_LINES = 2;

/**
 * A colored, rounded number badge + goal name + the two counts behind the goal: how many projects claim it,
 * and how many issuance (mint) events those projects have recorded. Both are shown because they answer
 * different questions and can diverge sharply — a goal claimed by many projects that have issued nothing
 * reads very differently from one claimed by a single heavily-issuing project.
 */
function sdgCard(sdg: ImpactSummaryResponseDto['sdgContributions'][number], height: number): Content {
    const numberBadge = roundedPanel(
        { text: String(sdg.sdgId), color: COLORS.white, bold: true, fontSize: 9, alignment: 'center' },
        SDG_BADGE_SIZE,
        SDG_BADGE_SIZE,
        { r: RADIUS.small, fill: sdg.color, stroke: null, padX: 0, padY: 4 },
    );

    return roundedPanel(
        {
            columns: [
                numberBadge,
                {
                    width: '*',
                    stack: [
                        { text: sdg.name, style: 'sdgName' },
                        {
                            text: `${formatNumber(sdg.projectCount)} ${sdg.projectCount === 1 ? 'project' : 'projects'}`,
                            style: 'sdgCount',
                            margin: [0, 1, 0, 0] as Margins,
                        },
                        {
                            text: `${formatNumber(sdg.issuances)} ${sdg.issuances === 1 ? 'issuance' : 'issuances'}`,
                            style: 'sdgCount',
                            margin: [0, 1, 0, 0] as Margins,
                        },
                    ],
                },
            ],
            columnGap: SDG_BADGE_GAP,
        },
        SDG_CHIP_WIDTH,
        height,
        { padX: SDG_PAD_X, padY: SDG_PAD_Y },
    );
}

/**
 * Card grid (chunked 4-per-row), from `summary.sdgContributions` (already sorted by SDG number).
 *
 * The caption block above and below the grid exists because the numbers alone are ambiguous: it was not clear
 * from the chips what was being counted, nor which goal the closing line was ranking on. So the caption now
 * says explicitly what population the grid covers, and the closing line names its own ranking metric.
 *
 * Note on the denominator: the repository returns only goals with at least one tagged project, so this can
 * never render all 17. The caption previously claimed "All 17 SDGs" alongside a "0 with 0 projects" tally
 * that was structurally always zero — it now reports the addressed count against 17 and says the rest are
 * omitted, which is what the data actually supports.
 */
function buildSdgSection(summary: ImpactSummaryResponseDto): Content[] {
    const sdgs = summary.sdgContributions;
    if (sdgs.length === 0) {
        return [{ text: 'No SDG contributions recorded.', style: 'footerNote' }];
    }

    const topGoal = [...sdgs].sort((a, b) => b.issuances - a.issuances || b.credits - a.credits || b.projectCount - a.projectCount)[0];
    // Chips carry their own explicit width, so a short final row keeps its chip size instead of stretching
    // to fill the row — no filler column needed.
    const rows = chunk(sdgs, SDG_CARDS_PER_ROW).map((row) => {
        const height = sdgRowHeight(row);
        return {
            columns: row.map((s) => sdgCard(s, height)),
            columnGap: SDG_GAP,
            margin: [0, 0, 0, SDG_GAP],
        } as Content;
    });

    const totalIssuances = sdgs.reduce((sum, s) => sum + s.issuances, 0);

    // Wrapped in a card like every other data section — and required for the grid to line up, since
    // SDG_CHIP_WIDTH is derived from a card's inner width, not the full content width.
    return [
        card([
            {
                text: `${sdgs.length} of the 17 UN Sustainable Development Goals addressed · ${formatNumber(totalIssuances)} issuances in total`,
                style: 'cardTitle',
                margin: [0, 0, 0, 3] as Margins,
            },
            {
                text:
                    'Each goal shows the number of projects claiming a contribution to it, and the issuance (mint) ' +
                    'events those projects have recorded on-chain. Goals no project has claimed are omitted. ' +
                    'A project may claim several goals, so these counts overlap and do not sum to the portfolio total.',
                style: 'footerNote',
                margin: [0, 0, 0, 10] as Margins,
            },
            ...rows,
            {
                text:
                    `Most issuances: SDG ${topGoal.sdgId} ${topGoal.name} — ` +
                    `${formatNumber(topGoal.issuances)} ${topGoal.issuances === 1 ? 'issuance' : 'issuances'} ` +
                    `across ${formatNumber(topGoal.projectCount)} ${topGoal.projectCount === 1 ? 'project' : 'projects'} ` +
                    `(${formatNumber(topGoal.credits)} tCO2e).`,
                style: 'noteText',
            },
        ]),
    ];
}

// ─────────────────────────────────────────────────────────────────────────
// Disclosure & Methodology Notes (2 cards + Limitations note)
// ─────────────────────────────────────────────────────────────────────────

function quadrant(title: string, body: string): Content {
    return { stack: [{ text: title, style: 'quadTitle' }, { text: body, style: 'quadBody' }] };
}

/**
 * Two cards (Calculation Methodology, Data Sources & Governance) matching the reference design's
 * 2-card Disclosure & Methodology Notes layout, plus one small italic Limitations note underneath
 * (not a third/fourth boxed card, to keep the reference's 2-card look intact). The Limitations note is
 * where the retirement-inference methodology, SDG self-report caveat, and country-level-only caveat
 * live — this is the Item-7 trade-off: the "(inferred)" qualifier is gone from every stat label, but the
 * *explanation* of how the retirement figure is derived is preserved here rather than deleted outright.
 */
function buildDisclosureNotesSection(summary: ImpactSummaryResponseDto, network: string): Content[] {
    const net = networkLabel(network);
    const calculation = quadrant(
        'Calculation Methodology',
        `Emissions Reduced (tCO2e) figures are as attested by the issuing registry and anchored on-chain via ` +
            `Hedera Guardian policy workflows. Figures correspond directly to token mint amounts recorded on ${net}.`,
    );
    const governance = quadrant(
        'Data Sources & Governance',
        `All data originates from the Hedera Guardian network (${net}). Registry data across ` +
            `${summary.registryBreakdown.length} registries is imported exclusively from pre-approved sources with ` +
            `automated verification support, per platform import policy.`,
    );

    return [
        { columns: [calculation, governance], columnGap: 16 },
        {
            text:
                `Limitations: Retirement rate is currently ${summary.retirementRateInferred}%. ${summary.retirementMethodologyNote} ` +
                `SDG contributions are self-reported by project developers via Guardian policy schemas and have not been ` +
                `independently assured. Geographic distribution is at country level only.`,
            style: 'noteText',
            margin: [0, 12, 0, 0],
        },
    ];
}

// ─────────────────────────────────────────────────────────────────────────
// Closing attribution card
// ─────────────────────────────────────────────────────────────────────────

/** Right-hand "Generated by" column of the closing banner; the left column takes what's left. */
const BANNER_META_WIDTH = 170;
const BANNER_CELL_PAD = 14;
/** Usable text width of the banner's left cell — the budget the wrapped Registry DID has to fit inside. */
const BANNER_TEXT_WIDTH = CONTENT_WIDTH - BANNER_META_WIDTH - BANNER_CELL_PAD * 2;

/**
 * Light green-tint attribution card (restyled from the old bright-green "Data Verified" banner to fit
 * the new cream palette) + Registry DID + right-aligned "Generated by" block. `generatedBy` comes from
 * the authenticated user threaded through `ImpactSummaryService.buildPdfDocument()` — name/email render
 * "--" when not supplied, never invented.
 */
function buildClosingAttribution(
    summary: ImpactSummaryResponseDto,
    network: string,
    scope: ImpactSummaryReportScope | undefined,
    generatedBy: ImpactSummaryGeneratedBy | undefined,
): Content {
    // Printed in full, never truncated. A DID is the one value in this report a reader has to be able to copy
    // and resolve; an ellipsis makes it useless for exactly the verification this banner is claiming. It sits
    // on its own line, pre-wrapped, so the full string stays inside the cell instead of running out of it.
    const rawDid = pickRegistryDid(summary, scope);
    const registryDid = rawDid ? wrapIdentifier(rawDid, BANNER_TEXT_WIDTH, DID_FONT_SIZE) : '--';

    return {
        margin: [0, 18, 0, 0],
        table: {
            widths: ['*', BANNER_META_WIDTH],
            body: [
                [
                    {
                        stack: [
                            { text: `Data Verified on ${networkLabel(network)}`, style: 'bannerTitle' },
                            {
                                text:
                                    `All figures in this report are derived from Hedera Guardian on-chain records ` +
                                    `and are independently verifiable via HashScan.`,
                                style: 'bannerBody',
                                margin: [0, 4, 0, 0],
                            },
                            {
                                text: [
                                    { text: 'Registry DID: ', style: 'metaLabel' },
                                    { text: registryDid, style: 'didValue' },
                                ],
                                margin: [0, 4, 0, 0],
                            },
                        ],
                        fillColor: COLORS.greenTint,
                        border: [false, false, false, false],
                        margin: [BANNER_CELL_PAD, BANNER_CELL_PAD, BANNER_CELL_PAD, BANNER_CELL_PAD],
                    },
                    {
                        stack: [
                            { text: 'Generated by', style: 'metaLabel', alignment: 'right' },
                            { text: generatedBy?.name || '--', style: 'metaValue', alignment: 'right' },
                            { text: generatedBy?.email || '--', style: 'metaLabel', alignment: 'right', margin: [0, 2, 0, 0] },
                        ],
                        fillColor: COLORS.greenTint,
                        border: [false, false, false, false],
                        margin: [BANNER_CELL_PAD, BANNER_CELL_PAD, BANNER_CELL_PAD, BANNER_CELL_PAD],
                    },
                ],
            ],
        },
        layout: 'noBorders',
    };
}

// ─────────────────────────────────────────────────────────────────────────
// Assembly
// ─────────────────────────────────────────────────────────────────────────

/** Builds the full pdfmake `TDocumentDefinitions` for the Impact Summary PDF. Pure — no I/O, no `pdfMake.createPdf()` call (that belongs to the streaming endpoint, alongside `IMPACT_SUMMARY_PDF_FONTS`). */
export function buildImpactSummaryPdfDocDefinition(params: ImpactSummaryPdfParams): TDocumentDefinitions {
    const { summary, network, reportId, scope, generatedAt, generatedBy } = params;

    return {
        pageSize: 'A4',
        pageMargins: [40, 90, 40, 60],
        background: buildPageBackground(),
        header: buildHeader(network, generatedAt),
        footer: buildFooter(generatedAt),
        defaultStyle: { font: PDF_FONT_FAMILY, fontSize: 9, color: COLORS.body },
        styles: PDF_STYLES,
        info: {
            title: 'ESG Impact Summary Report',
            subject: `Impact Summary — ${networkLabel(network)}`,
            author: 'Sustainability Atlas',
            creator: 'Sustainability Atlas',
        },
        content: [
            ...buildTitleBlock(network, scope),
            buildBadgeRowAndMeta(summary, reportId, network, generatedAt),
            buildMetricCards(summary),

            // Project Lifecycle + Credits by Sector
            sectionHeader('Credit Lifecycle & Sector Breakdown'),
            buildLifecycleCard(summary),
            buildSectorCard(summary),

            // Geographic Distribution
            sectionHeader('Geographic Distribution'),
            buildGeoCard(summary),

            // Credits by Registry
            sectionHeader('Credits by Registry'),
            buildRegistryTable(summary),

            // Credits by Methodology
            sectionHeader('Credits by Methodology'),
            buildMethodologyTable(summary),

            // Credits by Project
            sectionHeader('Credits by Project'),
            buildProjectTable(summary),

            // SDG Contributions
            sectionHeader('SDG Contributions'),
            ...buildSdgSection(summary),

            // Disclosure & Methodology Notes
            sectionHeader('Disclosure & Methodology Notes'),
            ...buildDisclosureNotesSection(summary, network),

            // Closing attribution
            buildClosingAttribution(summary, network, scope, generatedBy),
        ],
    };
}
