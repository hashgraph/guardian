import { FieldTypesDictionary } from '@guardian/interfaces';

interface UIAddon {
    key: string;
    icon: string;
    group: string;
    label?: string;
    accent?: boolean;
}

const FIELD_TYPE_ADDONS: Record<string, UIAddon> = {
    'Number':        { key: 'number',        icon: 'pi-hashtag',             group: 'Simple Types' },
    'Integer':       { key: 'integer',       icon: 'pi-sort-numeric-up-alt', group: 'Simple Types' },
    'String':        { key: 'string',        icon: 'pi-pencil',              group: 'Simple Types' },
    'Boolean':       { key: 'boolean',       icon: 'pi-check-square',        group: 'Simple Types' },
    'Date':          { key: 'date',          icon: 'pi-calendar',            group: 'Simple Types' },
    'Time':          { key: 'time',          icon: 'pi-clock',               group: 'Simple Types' },
    'DateTime':      { key: 'dateTime',      icon: 'pi-calendar',            group: 'Simple Types' },
    'Duration':      { key: 'duration',      icon: 'pi-hourglass',           group: 'Simple Types' },
    'URL':           { key: 'url',           icon: 'pi-link',                group: 'Simple Types' },
    'URI':           { key: 'uri',           icon: 'pi-external-link',       group: 'Simple Types' },
    'Email':         { key: 'email',         icon: 'pi-envelope',            group: 'Simple Types' },
    'Image':         { key: 'image',         icon: 'pi-image',               group: 'Simple Types' },
    'File':          { key: 'file',          icon: 'pi-upload',              group: 'Simple Types' },
    'Enum':          { key: 'enum',          icon: 'pi-list',                group: 'Simple Types' },
    'Help Text':     { key: 'helptext',      icon: 'pi-info-circle',         group: 'Simple Types' },
    'GeoJSON':       { key: 'geo',           icon: 'pi-map-marker',          group: 'Simple Types' },
    'SentinelHUB':   { key: 'sentinel',      icon: 'pi-globe',               group: 'Simple Types' },
    'Table':         { key: 'table',         icon: 'pi-table',               group: 'Simple Types' },
    'Rich Text':     { key: 'richText',      icon: 'pi-align-left',          group: 'Simple Types' },
    'Markdown':      { key: 'markdown',      icon: 'pi-hashtag',             group: 'Simple Types' },
    'Country':       { key: 'country',       icon: 'pi-flag',                group: 'Geographic' },
    'Continent':     { key: 'continent',     icon: 'pi-globe',               group: 'Geographic' },
    'State/Province': { key: 'state',         icon: 'pi-map-marker',          group: 'Geographic' },
    'postfix':       { key: 'postfix',       icon: 'pi-hashtag',             group: 'Units of Measure', label: 'Postfix' },
    'prefix':        { key: 'prefix',        icon: 'pi-hashtag',             group: 'Units of Measure', label: 'Prefix' },
    'hederaAccount': { key: 'hederaAccount', icon: 'pi-id-card',             group: 'Hedera',           label: 'Account' },
};

export interface FieldTypeUI {
    key: string;
    label: string;
    icon: string;
    group: string;
    schemaType: string;
    format?: string;
    pattern?: string;
    isRef?: boolean;
    customType?: string;
    unitSystem?: string;
    accent?: boolean;
}

const DEFAULT_ADDON: UIAddon = { key: '', icon: 'pi-question-circle', group: 'Simple Types' };
const GEOGRAPHIC_TYPE_ORDER = new Map([
    ['Continent', 0],
    ['Country', 1],
    ['State/Province', 2],
]);

export const FIELD_TYPES_UI: FieldTypeUI[] = [
    ...[...FieldTypesDictionary.FieldTypes, ...FieldTypesDictionary.CustomFieldTypes]
        .map((definition, index) => ({ definition, index }))
        .sort((a, b) => {
            const aOrder = GEOGRAPHIC_TYPE_ORDER.get(a.definition.name);
            const bOrder = GEOGRAPHIC_TYPE_ORDER.get(b.definition.name);
            return aOrder !== undefined && bOrder !== undefined
                ? aOrder - bOrder
                : a.index - b.index;
        })
        .map(({ definition: e }): FieldTypeUI => {
            const addon = FIELD_TYPE_ADDONS[e.name] ?? DEFAULT_ADDON;
            return {
                key: addon.key || e.name.toLowerCase().replace(/\s+/g, ''),
                label: addon.label ?? e.name,
                icon: addon.icon,
                group: addon.group,
                schemaType: e.type,
                format: e.format,
                pattern: e.pattern,
                isRef: e.isRef,
                customType: (e as any).customType,
                unitSystem: (e as any).unitSystem,
                ...(addon.accent ? { accent: true } : {}),
            };
        }),
    {
        key: 'sub-schema',
        label: 'Sub-schema',
        icon: 'pi-sitemap',
        group: 'Schema',
        schemaType: '',
        isRef: true,
        accent: true,
    },
];
