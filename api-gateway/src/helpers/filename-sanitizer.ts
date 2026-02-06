export class FilenameSanitizer {
    private static readonly DANGEROUS_CHARS_REGEX = /[/\\?%*:|"<>,\s.]/g;
    private static readonly CONTROL_REGEX = /[\x00-\x1f\x80-\x9f]/g;
    private static readonly RESERVED_REGEX = /^\.+$/;
    private static readonly WINDOWS_RESERVED_REGEX = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(\..*)?$/i;
    private static readonly WINDOWS_TRAILING_REGEX = /[\. ]+$/;
    private static readonly MULTIPLE_UNDERSCORES_REGEX = /_{2,}/g;

    public static sanitize(fileName: string): string {
        return fileName.replace(FilenameSanitizer.DANGEROUS_CHARS_REGEX, '_')
            .replace(FilenameSanitizer.CONTROL_REGEX, '_')
            .replace(FilenameSanitizer.RESERVED_REGEX, '_')
            .replace(FilenameSanitizer.WINDOWS_RESERVED_REGEX, '_')
            .replace(FilenameSanitizer.WINDOWS_TRAILING_REGEX, '_')
            .replace(FilenameSanitizer.MULTIPLE_UNDERSCORES_REGEX, '_');
    }
}
