import type { FieldRendererProps } from "../../types/props";

const HEADING_TAGS: Record<string, keyof JSX.IntrinsicElements> = {
  h1: "h1", h2: "h2", h3: "h3", h4: "h4", h5: "h5", h6: "h6",
};

/** Strip script tags, on* handlers, and javascript: URIs from backend HTML */
function sanitizeHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, "")
    .replace(/href\s*=\s*["']?\s*javascript:[^"'\s>]*/gi, 'href="#"');
}

/**
 * `placeholder` field — renders static HTML content (heading, paragraph, HTML).
 * The content comes from `field.label` or `field.settings.content`.
 */
export function PlaceholderField({ field }: FieldRendererProps) {
  const settings = field.settings ?? {};
  const sizeType = (settings.type as string | undefined) ?? "p";
  const content = (settings.content as string | undefined) ?? field.label ?? field.title ?? "";

  const Tag = HEADING_TAGS[sizeType] ?? "p";

  return (
    <Tag
      className={`ff-form__placeholder ff-form__placeholder--${sizeType}`}
      dangerouslySetInnerHTML={{ __html: sanitizeHtml(content) }}
    />
  );
}
