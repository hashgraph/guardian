export class FilenameSanitizer {
    private static readonly DANGEROUS_CHARS_REGEX = /[/\\?%*:|"<>,\s.]/g;
    private static readonly NON_PRINTABLE_ASCII_REGEX = /[^\x20-\x7e]/g;
    private static readonly RESERVED_REGEX = /^\.+$/;
    private static readonly WINDOWS_RESERVED_REGEX = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(\..*)?$/i;
    private static readonly WINDOWS_TRAILING_REGEX = /[\. ]+$/;
    private static readonly MULTIPLE_UNDERSCORES_REGEX = /_{2,}/g;

    public static sanitize(fileName: string): string {
        return fileName.replace(FilenameSanitizer.DANGEROUS_CHARS_REGEX, '_')
            .replace(FilenameSanitizer.NON_PRINTABLE_ASCII_REGEX, '_')
            .replace(FilenameSanitizer.RESERVED_REGEX, '_')
            .replace(FilenameSanitizer.WINDOWS_RESERVED_REGEX, '_')
            .replace(FilenameSanitizer.WINDOWS_TRAILING_REGEX, '_')
            .replace(FilenameSanitizer.MULTIPLE_UNDERSCORES_REGEX, '_');
    }

    /**
     * Build an RFC 6266 / RFC 5987 Content-Disposition value that survives
     * non-ASCII characters in `name`. The ASCII `filename=` parameter is the
     * sanitized fallback; `filename*=UTF-8''<percent-encoded>` preserves the
     * original name for clients that understand it.
     */
    public static contentDisposition(name: string, extension = ''): string {
        const ascii = `${FilenameSanitizer.sanitize(name)}${extension}`;
        const utf8 = `${encodeURIComponent(name).replace(/'/g, '%27')}${extension}`;
        return `attachment; filename="${ascii}"; filename*=UTF-8''${utf8}`;
    }
}
