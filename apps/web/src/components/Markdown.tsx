import { ReactNode } from 'react';

/**
 * Minimal, dependency-free Markdown renderer for the short snippets the AI
 * returns (bold, italic, inline code, bullet/numbered lists, headings).
 * It builds React elements directly — no dangerouslySetInnerHTML, so it is
 * safe against HTML injection.
 */

function parseInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  // **bold** | *italic* | _italic_ | `code`
  const re = /(\*\*([^*]+)\*\*|\*([^*]+)\*|_([^_]+)_|`([^`]+)`)/g;
  let last = 0;
  let key = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    if (m[2] !== undefined) nodes.push(<strong key={key++}>{m[2]}</strong>);
    else if (m[3] !== undefined) nodes.push(<em key={key++}>{m[3]}</em>);
    else if (m[4] !== undefined) nodes.push(<em key={key++}>{m[4]}</em>);
    else if (m[5] !== undefined)
      nodes.push(
        <code key={key++} className="rounded bg-black/10 px-1 text-[0.85em]">
          {m[5]}
        </code>,
      );
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export function Markdown({ text, className }: { text: string; className?: string }) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const blocks: ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const flush = () => {
    if (!list) return;
    const items = list.items.map((it, i) => <li key={i}>{parseInline(it)}</li>);
    blocks.push(
      list.ordered ? (
        <ol key={blocks.length} className="my-1 list-decimal space-y-0.5 pl-5">{items}</ol>
      ) : (
        <ul key={blocks.length} className="my-1 list-disc space-y-0.5 pl-5">{items}</ul>
      ),
    );
    list = null;
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (line === '') {
      flush();
      continue;
    }
    const bullet = line.match(/^[-*]\s+(.*)$/);
    const ordered = line.match(/^\d+[.)]\s+(.*)$/);
    if (bullet) {
      if (!list || list.ordered) {
        flush();
        list = { ordered: false, items: [] };
      }
      list.items.push(bullet[1]);
      continue;
    }
    if (ordered) {
      if (!list || !list.ordered) {
        flush();
        list = { ordered: true, items: [] };
      }
      list.items.push(ordered[1]);
      continue;
    }
    flush();
    const heading = line.match(/^#{1,6}\s+(.*)$/);
    if (heading) {
      blocks.push(
        <p key={blocks.length} className="font-semibold">{parseInline(heading[1])}</p>,
      );
      continue;
    }
    blocks.push(<p key={blocks.length}>{parseInline(line)}</p>);
  }
  flush();

  return <div className={className}>{blocks}</div>;
}
