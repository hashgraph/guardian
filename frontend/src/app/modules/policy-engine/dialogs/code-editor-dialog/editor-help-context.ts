export interface EditorHelpContext {
    availableFields: string[];
    operators?: { label: string; symbol: string }[];
    functions?: { category: string; items: { name: string; description: string }[] }[];
    parameters?: { name: string; description: string; methods?: { name: string; description: string }[] }[];
    examples?: { label: string; code: string }[];
    scopeNote?: string;
}
