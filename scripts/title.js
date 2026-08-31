// The title-case convention for entry titles:
//
//   1. Capitalize every word,
//   2. except a minor word — an article, a coordinating conjunction, or any
//      preposition, however long,
//   3. unless it is the first or the last word.
//   4. An acronym is spelled the way ACRONYMS spells it.
//   5. Each hyphen- or slash-separated part is a word of its own.
//   6. A dimension spaces out around a lowercase ascii x: 'Brick 2 x 4 x 2'.
//
// titleCase turns a url slug into the first-guess title a new entry starts
// with; titleIssues reads the same two tables backwards over a title someone
// typed. It reports only what the rules settle, and never that a word should
// be capitalized — so a deliberate 'Clip slides on Handle' passes.

const MINOR = new Set([
  'a', 'an', 'the',
  'and', 'but', 'nor', 'or',
  'as', 'at', 'by', 'for', 'from', 'in', 'into', 'of', 'on', 'onto', 'over',
  'per', 'to', 'up', 'via', 'with',
  'above', 'across', 'against', 'around', 'behind', 'below', 'between',
  'through', 'under', 'within', 'without',
]);

const ACRONYMS = new Map(
  ['GSNOT', 'LDU', 'LDraw', 'SNIR', 'SNOT', 'ToPLES'].map((a) => [a.toLowerCase(), a]),
);

const capitalize = (word) => word.replace(/^[a-z]/, (letter) => letter.toUpperCase());
const parts = (word) => word.split(/([-/])/);
const spaceDimensions = (text) => text.replace(/(\d)[-\s]?x[-\s]?(?=\d)/g, '$1 x ');

export function titleCase(slug) {
  const words = spaceDimensions(slug).split('-');
  return words
    .map((word, i) =>
      i > 0 && i < words.length - 1 && MINOR.has(word)
        ? word
        : parts(word).map((part) => ACRONYMS.get(part) ?? capitalize(part)).join(''))
    .join(' ');
}

export function titleIssues(title) {
  const words = title.split(' ');
  const issues = [];

  words.forEach((word, i) => {
    const minor = word.toLowerCase();
    if (i > 0 && i < words.length - 1 && MINOR.has(minor) && word !== minor) {
      issues.push(`"${word}" is a minor word — "${minor}"`);
    }
    for (const part of parts(word)) {
      const acronym = ACRONYMS.get(part.toLowerCase());
      if (acronym && part !== acronym) issues.push(`"${part}" is spelled "${acronym}"`);
    }
  });

  if (/\d\s*[×X]\s*\d/.test(title)) issues.push('a dimension joins with a lowercase ascii "x"');
  if (/\dx\d/.test(title)) issues.push('a dimension spaces out — "1 x 2", not "1x2"');
  return issues;
}
