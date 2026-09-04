/**
 * Flexible text matching for names and search boxes.
 * Ignores case, dots, hyphens, extra spaces, and Dr/Doctor honorifics.
 */

const HONORIFIC_WORDS = new Set(["dr", "doc", "doctor"]);

function normalizeSearchText(text: string | null | undefined): string {
  return (text ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.'’`·•‧∙．。]/g, " ")
    .replace(/[-_/\\,]+/g, " ")
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanToken(token: string): string {
  return token.replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, "");
}

function expandSearchWord(word: string): string[] {
  const variants = new Set<string>([word]);
  if (word === "dr" || word === "doc") variants.add("doctor");
  if (word === "doctor") variants.add("dr");
  return [...variants];
}

function compactNormalized(text: string): string {
  return normalizeSearchText(text).replace(/[^a-z0-9]+/g, "");
}

/** Drop Dr/Doctor tokens when the query also has a real name (e.g. "dr laila"). */
function significantQueryWords(words: string[]): string[] {
  const rest = words.filter((word) => !HONORIFIC_WORDS.has(word));
  return rest.length > 0 ? rest : words;
}

function getQueryWords(q: string): string[] {
  return normalizeSearchText(q)
    .split(/\s+/)
    .map(cleanToken)
    .filter((word) => word.length > 0);
}

function getTextTokens(...parts: (string | null | undefined)[]): string[] {
  return parts
    .map((part) => normalizeSearchText(part))
    .filter(Boolean)
    .flatMap((text) => text.split(/\s+/))
    .map(cleanToken)
    .filter((token) => token.length > 0);
}

function tokenMatchesWord(
  token: string,
  word: string,
  allowSingleCharPrefix = false,
): boolean {
  if (!word || !token) return false;

  const wordVariants = expandSearchWord(word);
  const tokenVariants = expandSearchWord(token);

  for (const w of wordVariants) {
    for (const t of tokenVariants) {
      if (t === w) return true;
      if (w.length >= 2 && t.startsWith(w)) return true;
      if (t.length >= 2 && w.startsWith(t)) return true;
      if (allowSingleCharPrefix && w.length === 1 && t.length >= 2 && t.startsWith(w)) {
        return true;
      }
    }
  }

  return false;
}

function anyTokenMatchesWord(
  tokens: string[],
  word: string,
  allowSingleCharPrefix = false,
): boolean {
  return tokens.some((token) => tokenMatchesWord(token, word, allowSingleCharPrefix));
}

function wordMatchesNormalizedBlob(blob: string, word: string): boolean {
  if (!word) return false;
  const compactBlob = blob.replace(/\s+/g, "");
  const variants = expandSearchWord(word);

  return variants.some((variant) => {
    if (variant.length < 2) return false;
    return blob.includes(variant) || compactBlob.includes(variant.replace(/\s+/g, ""));
  });
}

export function getFlexibleSearchWords(q: string): string[] {
  return getQueryWords(q);
}

/** True when `query` matches `text` ignoring case/punctuation/spacing/honorifics. */
export function matchesFlexibleText(
  text: string | null | undefined,
  query: string | null | undefined,
): boolean {
  const q = (query ?? "").trim();
  if (!q) return true;

  const queryWords = getQueryWords(q);
  if (queryWords.length === 0) return false;

  const haystack = text ?? "";
  const fullNorm = normalizeSearchText(haystack);
  const compactHay = compactNormalized(haystack);
  const matchWords = significantQueryWords(queryWords);
  const compactQuery = matchWords.join("");
  const queryNorm = matchWords.join(" ");

  // "dr laila" / "dr.laila" / "Dr Laila" all match "Dr.Laila"
  if (compactQuery.length >= 2 && compactHay.includes(compactQuery)) {
    return true;
  }

  // Normalized substring after turning dots into spaces
  if (queryNorm.length >= 2 && fullNorm.includes(queryNorm)) {
    return true;
  }

  const tokens = getTextTokens(haystack);
  return matchWords.every((word) => {
    if (
      word.length >= 2 &&
      (wordMatchesNormalizedBlob(fullNorm, word) ||
        compactHay.includes(word.replace(/\s+/g, "")))
    ) {
      return true;
    }
    return anyTokenMatchesWord(tokens, word, true);
  });
}

/** True when any of the fields matches the query flexibly. */
export function matchesAnyFlexibleText(
  fields: Array<string | null | undefined>,
  query: string | null | undefined,
): boolean {
  const q = (query ?? "").trim();
  if (!q) return true;
  return fields.some((field) => matchesFlexibleText(field, q));
}

/** Person-name alias used by chat / doctor search. */
export function matchesPersonName(fullName: string, q: string): boolean {
  return matchesFlexibleText(fullName, q);
}

export function getPersonSearchWords(q: string): string[] {
  return getFlexibleSearchWords(q);
}

export {
  normalizeSearchText,
  compactNormalized,
  getQueryWords,
  getTextTokens,
  expandSearchWord,
  anyTokenMatchesWord,
  wordMatchesNormalizedBlob,
};
