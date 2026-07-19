function getLevenshteinDistance(a: string, b: string): number {
  const matrix = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }

  return matrix[a.length][b.length];
}

export function fuzzyMatch(text: string, query: string): boolean {
  const cleanText = text.toLowerCase().trim();
  const cleanQuery = query.toLowerCase().trim();

  if (!cleanQuery) return true;
  if (cleanText.includes(cleanQuery)) return true;

  const textWords = cleanText.split(/\s+/).map((w) => w.replace(/[^a-z0-9]/g, ""));
  const queryWords = cleanQuery.split(/\s+/).map((w) => w.replace(/[^a-z0-9]/g, ""));

  return queryWords.every((qw) => {
    if (!qw) return true;

    let queryIdx = 0;
    for (let textIdx = 0; textIdx < cleanText.length; textIdx++) {
      if (cleanText[textIdx] === qw[queryIdx]) {
        queryIdx++;
      }
      if (queryIdx === qw.length) {
        return true;
      }
    }

    const maxEdits = qw.length <= 3 ? 0 : qw.length <= 6 ? 1 : 2;

    return textWords.some((tw) => {
      if (tw.startsWith(qw) || qw.startsWith(tw)) return true;
      const distance = getLevenshteinDistance(tw, qw);
      return distance <= maxEdits;
    });
  });
}
