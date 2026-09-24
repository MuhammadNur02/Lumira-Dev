/**
 * Renders a plain-string CMS field (feature and tile bodies are `string`, not Portable Text) with
 * `backtick` segments as inline code, so editors can reference commands and file names naturally.
 * Server-safe: no client JavaScript.
 */
export function InlineText({ text }: { text: string }) {
  const parts = text.split(/(`[^`]+`)/).filter(Boolean)
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith('`') && part.endsWith('`') ? (
          <code key={i} className="rounded-xs bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground">
            {part.slice(1, -1)}
          </code>
        ) : (
          part
        ),
      )}
    </>
  )
}
