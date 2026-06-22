export function extractTableOfContents(html: string): Array<{ depth: number; text: string; id: string }> {
  const headings = [...html.matchAll(/<h([1-6]) id="([^"]+)">([\s\S]*?)<\/h\1>/g)];
  return headings.map((match) => ({
    depth: Number(match[1]),
    id: match[2],
    text: match[3].replace(/<[^>]+>/g, '').trim(),
  }));
}
