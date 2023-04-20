import { ApiResponse } from '@api/helpers/api-response';
import {
    Theme,
    MessageResponse,
    MessageError,
    Logger,
    DatabaseServer,
    BinaryMessageResponse,
} from '@guardian/common';
import JSZip from 'jszip';
import { GenerateUUIDv4, MessageAPI } from '@guardian/interfaces';

/**
 * Generate Zip File
 * @param theme
 *
 * @returns Zip file
 */
export async function generateZipFile(theme: Theme): Promise<JSZip> {
    const object = { ...theme };
    delete object.id;
    delete object._id;
    delete object.owner;
    delete object.createDate;
    delete object.updateDate;
    if (!Array.isArray(object.rules)) {
        object.rules = [];
    }
    const zip = new JSZip();
    zip.file('theme.json', JSON.stringify(object));
    return zip;
}

/**
 * Parse zip theme file
 * @param zipFile Zip file
 * @returns Parsed theme
 */
export async function parseZipFile(zipFile: any): Promise<any> {
    const zip = new JSZip();
    const content = await zip.loadAsync(zipFile);
    if (!content.files['theme.json'] || content.files['theme.json'].dir) {
        throw new Error('Zip file is not a theme');
    }
    const themeString = await content.files['theme.json'].async('string');
    const theme = JSON.parse(themeString);
    return { theme };
}

/**
 * Connect to the message broker methods of working with themes.
 */
export async function themeAPI(): Promise<void> {
    /**
     * Create new theme
     *
     * @param payload - theme
     *
     * @returns {Theme} new theme
     */
    ApiResponse(MessageAPI.CREATE_THEME, async (msg) => {
        try {
            if (!msg) {
                throw new Error('Invalid create theme parameters');
            }
            const { theme, owner } = msg;
            theme.owner = owner;

            const item = await DatabaseServer.createTheme(theme);
            return new MessageResponse(item);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    /**
     * Update theme
     *
     * @param payload - theme
     *
     * @returns {Theme} theme
     */
    ApiResponse(MessageAPI.UPDATE_THEME, async (msg) => {
        try {
            if (!msg) {
                return new MessageError('Invalid update theme parameters');
            }
            const { themeId, theme, owner } = msg;

            const item = await DatabaseServer.getTheme({
                id: themeId,
                owner
            });

            if (!item || item.owner !== owner) {
                throw new Error('Invalid theme');
            }

            item.name = theme.name;
            item.description = theme.description;
            item.rules = theme.rules;

            const result = await DatabaseServer.updateTheme(item);
            return new MessageResponse(result);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    /**
     * Get themes
     *
     * @param {any} msg - Get themes parameters
     *
     * @returns {any} themes
     */
    ApiResponse(MessageAPI.GET_THEMES, async (msg) => {
        try {
            if (!msg) {
                return new MessageError('Invalid get theme parameters');
            }
            const { owner } = msg;
            const items = await DatabaseServer.getThemes({ owner });
            return new MessageResponse(items);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    /**
     * Get theme by Id
     *
     * @param {any} msg - Get themes parameters
     *
     * @returns {any} theme
     */
    ApiResponse(MessageAPI.GET_THEME, async (msg) => {
        try {
            if (!msg) {
                return new MessageError('Invalid get theme parameters');
            }
            const { themeId } = msg;
            const item = await DatabaseServer.getTheme({ id: themeId });
            return new MessageResponse(item);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    /**
     * Delete theme
     *
     * @param {any} msg - Delete theme parameters
     *
     * @returns {boolean} - Operation success
     */
    ApiResponse(MessageAPI.DELETE_THEME, async (msg) => {
        try {
            if (!msg) {
                return new MessageError('Invalid delete theme parameters');
            }
            const { themeId, owner } = msg;
            const item = await DatabaseServer.getTheme({ id: themeId, owner });
            await DatabaseServer.removeTheme(item);
            return new MessageResponse(true);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    /**
     * Export theme
     *
     * @param {any} msg - Export theme parameters
     *
     * @returns {boolean} - zip file
     */
    ApiResponse(MessageAPI.THEME_EXPORT_FILE, async (msg) => {
        try {
            if (!msg) {
                return new MessageError('Invalid export theme parameters');
            }
            const { themeId, owner } = msg;
            const item = await DatabaseServer.getTheme({ id: themeId, owner });
            const zip = await generateZipFile(item);
            const file = await zip.generateAsync({
                type: 'arraybuffer',
                compression: 'DEFLATE',
                compressionOptions: {
                    level: 3,
                },
            });
            return new BinaryMessageResponse(file);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    /**
     * Import theme
     *
     * @param {any} msg - Import theme parameters
     *
     * @returns {boolean} - new theme
     */
    ApiResponse(MessageAPI.THEME_IMPORT_FILE, async (msg) => {
        try {
            const { zip, owner } = msg;
            if (!zip) {
                throw new Error('file in body is empty');
            }

            const preview = await parseZipFile(Buffer.from(zip.data));

            const { theme } = preview;
            delete theme._id;
            delete theme.id;
            theme.uuid = GenerateUUIDv4();
            theme.owner = owner;

            if (await DatabaseServer.getTheme({ name: theme.name, owner })) {
                theme.name = theme.name + '_' + Date.now();
            }
            const item = await DatabaseServer.createTheme(theme);

            return new MessageResponse(item);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });
}
