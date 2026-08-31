export function formatSchemaTemplateBindingLabel(binding: { templateName?: string; templateVersion?: string } | null | undefined): string {
    if (!binding?.templateName) {
        return '';
    }
    return binding.templateVersion
        ? `${binding.templateName} v${binding.templateVersion}`
        : binding.templateName;
}
