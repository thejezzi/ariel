export function parseOrderFile(content: string): string[] {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));
}

export function sortNames<T extends { name: string }>(items: T[], orderedNames: string[]): T[] {
  const orderIndex = new Map(orderedNames.map((name, index) => [name, index]));
  return [...items].sort((a, b) => {
    const aIndex = orderIndex.get(a.name);
    const bIndex = orderIndex.get(b.name);

    if (aIndex !== undefined && bIndex !== undefined) return aIndex - bIndex;
    if (aIndex !== undefined) return -1;
    if (bIndex !== undefined) return 1;

    const aIsReadme = /^readme\.(md|mdx)$/i.test(a.name);
    const bIsReadme = /^readme\.(md|mdx)$/i.test(b.name);
    if (aIsReadme && !bIsReadme) return -1;
    if (!aIsReadme && bIsReadme) return 1;

    return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
  });
}
