/**
 * JSON-LD <script>. "<" is escaped so a CMS string containing "</script>"
 * can't break out of the tag and inject markup.
 */
export function JsonLd({ data }: { data: unknown }) {
  const json = JSON.stringify(data).replace(/</g, "\u003c");
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
