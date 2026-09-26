import type { SwaggerCustomOptions } from '@nestjs/swagger';
import { SWAGGER_LOGO_BASE64_PNG } from '../swagger-logo';

const FONT = `'Segoe UI', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif`;

const CSS = `
    :root {
        --atlas-page: #f8fafc;
        --atlas-card: #ffffff;
        --atlas-subtle: #f8fafc;
        --atlas-ink: #0f172a;
        --atlas-body: #334155;
        --atlas-muted: #64748b;
        --atlas-border: #e2e8f0;
        --atlas-input-border: #cbd5e1;
        --atlas-code-bg: #f1f5f9;
        --atlas-pre-bg: #0f172a;
        --atlas-pre-text: #e2e8f0;
        --atlas-accent: #0f766e;
        --atlas-note-bg: #fffbeb;
        --atlas-note-border: #f59e0b;
        --atlas-shadow: 0 1px 3px rgba(15, 23, 42, 0.06);
    }
    html.dark-mode {
        --atlas-page: #1c2022;
        --atlas-card: #252b2e;
        --atlas-subtle: #1f2427;
        --atlas-ink: #f0f1f1;
        --atlas-body: #cfd4d6;
        --atlas-muted: #9aa4a9;
        --atlas-border: #3a4246;
        --atlas-input-border: #4b5559;
        --atlas-code-bg: #0f1315;
        --atlas-pre-bg: #0f1315;
        --atlas-pre-text: #e4e6e6;
        --atlas-accent: #2dd4bf;
        --atlas-note-bg: #33291a;
        --atlas-note-border: #f59e0b;
        --atlas-shadow: none;
    }

    body { background: var(--atlas-page); }
    .swagger-ui, .swagger-ui .info .title, .swagger-ui .opblock-tag, .swagger-ui table,
    .swagger-ui input, .swagger-ui select, .swagger-ui button { font-family: ${FONT}; }
    .swagger-ui { color: var(--atlas-ink); }
    .swagger-ui .wrapper { max-width: 1080px; padding: 0 24px; }

    .swagger-ui .topbar { background: #0f172a; padding: 12px 0; }
    .swagger-ui .topbar .download-url-wrapper, .swagger-ui .topbar-wrapper .link { display: none; }
    .swagger-ui .topbar-wrapper { display: flex; align-items: center; gap: 12px; }
    .swagger-ui .topbar-wrapper::before {
        content: ''; order: 0; width: 32px; height: 32px;
        background: url(data:image/png;base64,${SWAGGER_LOGO_BASE64_PNG}) no-repeat center / contain;
    }
    .swagger-ui .topbar-wrapper::after { content: 'Sustainability Atlas'; order: 1; color: #fff; font-size: 18px; font-weight: 600; }
    .swagger-ui .topbar .dark-mode-toggle { order: 2; margin-left: auto; }

    .swagger-ui .information-container { margin-top: 32px; }
    .swagger-ui .information-container .info {
        background: var(--atlas-card); border: 1px solid var(--atlas-border); border-radius: 16px; margin: 0;
        padding: 32px 40px; box-shadow: var(--atlas-shadow);
    }
    .swagger-ui .info hgroup.main { margin: 0 0 12px; }
    .swagger-ui .info hgroup.main a, .swagger-ui .info .title small { display: none; }
    .swagger-ui .info .title { font-size: 30px; font-weight: 700; color: var(--atlas-ink); }
    .swagger-ui .info .description { max-width: 780px; }
    .swagger-ui .info .description p, .swagger-ui .info .description li { font-size: 15px; line-height: 1.7; color: var(--atlas-body); }
    .swagger-ui .info .description h3 { font-size: 18px; font-weight: 600; color: var(--atlas-ink); margin: 28px 0 8px; }
    .swagger-ui .info .description h4 { font-size: 15px; font-weight: 600; color: var(--atlas-ink); margin: 22px 0 6px; }
    .swagger-ui .info .description strong { color: var(--atlas-ink); }
    .swagger-ui .info .description ul, .swagger-ui .info .description ol { padding-left: 22px; margin: 8px 0; }
    .swagger-ui .info .description li { margin: 6px 0; }
    .swagger-ui .info .description a { color: var(--atlas-accent); }
    .swagger-ui .info .description blockquote {
        margin: 16px 0; padding: 10px 16px; border-left: 4px solid var(--atlas-note-border);
        background: var(--atlas-note-bg); border-radius: 0 8px 8px 0;
    }

    .swagger-ui .markdown code, .swagger-ui .renderedMarkdown code {
        background: var(--atlas-code-bg); color: var(--atlas-ink); border-radius: 4px; padding: 1px 6px; font-size: 13px;
    }
    .swagger-ui .markdown pre, .swagger-ui .renderedMarkdown pre { background: var(--atlas-pre-bg); border-radius: 8px; padding: 12px 16px; }
    .swagger-ui .markdown pre code, .swagger-ui .renderedMarkdown pre code { background: none; color: var(--atlas-pre-text); padding: 0; }
    .swagger-ui .markdown table, .swagger-ui .renderedMarkdown table { border-collapse: collapse; width: 100%; margin: 12px 0; font-size: 14px; }
    .swagger-ui .markdown th, .swagger-ui .markdown td, .swagger-ui .renderedMarkdown th, .swagger-ui .renderedMarkdown td {
        border: 1px solid var(--atlas-border); padding: 8px 12px; text-align: left; vertical-align: top; color: var(--atlas-body);
    }
    .swagger-ui .markdown th, .swagger-ui .renderedMarkdown th { background: var(--atlas-subtle); color: var(--atlas-ink); font-weight: 600; }
    .swagger-ui details {
        border: 1px solid var(--atlas-border); border-radius: 10px; background: var(--atlas-subtle);
        padding: 0 18px; margin: 16px 0 4px; color: var(--atlas-body);
    }
    .swagger-ui details[open] { padding-bottom: 10px; }
    .swagger-ui details > summary { cursor: pointer; padding: 12px 0; font-size: 14px; font-weight: 600; color: var(--atlas-accent); }

    .swagger-ui .scheme-container { background: transparent; box-shadow: none; margin: 0; padding: 20px 0 4px; }
    .swagger-ui .scheme-container .schemes > label, .swagger-ui .servers-title { color: var(--atlas-ink); }
    .swagger-ui .btn.authorize { background: var(--atlas-card); border-color: var(--atlas-accent); color: var(--atlas-accent); border-radius: 8px; }
    .swagger-ui .btn.authorize svg { fill: var(--atlas-accent); }
    .swagger-ui .filter .operation-filter-input {
        background: var(--atlas-card); color: var(--atlas-ink); border: 1px solid var(--atlas-input-border);
        border-radius: 10px; padding: 10px 14px; margin: 8px 0 16px; font-size: 14px;
    }

    .swagger-ui .opblock-tag-section {
        background: var(--atlas-card); border: 1px solid var(--atlas-border); border-radius: 14px;
        padding: 2px 20px; margin-bottom: 14px;
    }
    .swagger-ui .opblock-tag { border-bottom: none; padding: 14px 0; font-size: 20px; font-weight: 600; color: var(--atlas-ink); }
    .swagger-ui .opblock-tag small { padding: 0 0 0 14px; font-size: 14px; font-weight: 400; color: var(--atlas-muted); }
    .swagger-ui .opblock-tag svg { fill: var(--atlas-muted); }
    .swagger-ui .opblock-tag-section.is-open .opblock-tag { border-bottom: 1px solid var(--atlas-border); margin-bottom: 12px; }

    .swagger-ui .opblock { border-radius: 10px; box-shadow: none; margin: 0 0 10px; }
    .swagger-ui .opblock .opblock-summary { padding: 8px 12px; }
    .swagger-ui .opblock .opblock-summary-method { min-width: 72px; border-radius: 6px; font-size: 13px; font-weight: 600; }
    .swagger-ui .opblock .opblock-summary-path, .swagger-ui .opblock .opblock-summary-path * { font-size: 13px; font-weight: 400; color: var(--atlas-muted); }
    .swagger-ui .opblock .opblock-summary-description { font-size: 14px; font-weight: 500; color: var(--atlas-ink); }
    .swagger-ui .opblock-description-wrapper p { font-size: 14px; line-height: 1.6; color: var(--atlas-body); }
    .swagger-ui .opblock .opblock-section-header { background: var(--atlas-subtle); box-shadow: none; }
    .swagger-ui .opblock .opblock-section-header h4, .swagger-ui .opblock .opblock-section-header > label { color: var(--atlas-ink); }
`;

export const SWAGGER_UI_OPTIONS: SwaggerCustomOptions = {
    customCss: CSS,
    swaggerOptions: {
        persistAuthorization: true,
        docExpansion: 'none',
        defaultModelsExpandDepth: -1,
        filter: true,
        displayRequestDuration: true,
    },
};
