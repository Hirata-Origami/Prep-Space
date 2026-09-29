import type { LanguageId } from './types';

export type TokenKind = 'kw' | 'str' | 'com' | 'num' | 'fn' | 'plain';
export interface Token {
  text: string;
  kind: TokenKind;
}

const KEYWORDS: Record<LanguageId, string> = {
  markdown: '',
  sql:
    'select from where group by having order limit offset insert into values update set delete create table alter drop index view join inner left right full outer cross on as and or not in is null like between exists union all distinct case when then else end with over partition primary key foreign references unique default constraint asc desc count sum avg min max',
  javascript:
    'const let var function return if else for while do switch case break continue new class extends import export from default async await try catch finally throw typeof instanceof in of this null undefined true false yield static',
  typescript:
    'const let var function return if else for while do switch case break continue new class extends implements import export from default async await try catch finally throw typeof instanceof in of this null undefined true false interface type enum readonly private public protected static as keyof',
  python:
    'def class return if elif else for while in not and or is None True False import from as with try except finally raise lambda yield pass break continue global nonlocal async await self',
  java:
    'public private protected static final class interface extends implements new return if else for while do switch case break continue try catch finally throw throws import package void int long double float boolean char byte short null true false this super abstract',
  go: 'func package import var const type struct interface map chan go defer return if else for range switch case break continue select fallthrough nil true false make new',
  cpp: 'int long double float bool char void auto const static class struct public private protected template typename namespace using return if else for while do switch case break continue new delete nullptr true false include define std',
};

const LINE_COMMENT: Record<LanguageId, string | null> = {
  markdown: null, sql: '--', javascript: '//', typescript: '//', python: '#', java: '//', go: '//', cpp: '//',
};

/** Small tokenizer for display only. It is deliberately forgiving: unknown input just renders plain. */
export function tokenize(code: string, lang: LanguageId): Token[] {
  if (lang === 'markdown') return [{ text: code, kind: 'plain' }];
  const words = new Set(KEYWORDS[lang].split(' '));
  const ci = lang === 'sql';
  const line = LINE_COMMENT[lang];
  const out: Token[] = [];
  let i = 0;
  let plain = '';
  const flush = () => {
    if (plain) out.push({ text: plain, kind: 'plain' });
    plain = '';
  };
  const push = (text: string, kind: TokenKind) => {
    flush();
    out.push({ text, kind });
  };

  while (i < code.length) {
    const c = code[i];
    if (line && code.startsWith(line, i)) {
      const end = code.indexOf('\n', i);
      const stop = end === -1 ? code.length : end;
      push(code.slice(i, stop), 'com');
      i = stop;
    } else if (lang !== 'python' && lang !== 'sql' && code.startsWith('/*', i)) {
      const end = code.indexOf('*/', i + 2);
      const stop = end === -1 ? code.length : end + 2;
      push(code.slice(i, stop), 'com');
      i = stop;
    } else if (lang === 'sql' && code.startsWith('/*', i)) {
      const end = code.indexOf('*/', i + 2);
      const stop = end === -1 ? code.length : end + 2;
      push(code.slice(i, stop), 'com');
      i = stop;
    } else if (c === '"' || c === "'" || (c === '`' && lang !== 'sql' && lang !== 'python')) {
      let j = i + 1;
      while (j < code.length && code[j] !== c && code[j] !== '\n') {
        if (code[j] === '\\') j++;
        j++;
      }
      const stop = Math.min(code.length, j + 1);
      push(code.slice(i, stop), 'str');
      i = stop;
    } else if (/[0-9]/.test(c) && !/[\w]/.test(code[i - 1] ?? ' ')) {
      let j = i;
      while (j < code.length && /[0-9._xa-fA-F]/.test(code[j])) j++;
      push(code.slice(i, j), 'num');
      i = j;
    } else if (/[A-Za-z_]/.test(c)) {
      let j = i;
      while (j < code.length && /[\w]/.test(code[j])) j++;
      const word = code.slice(i, j);
      if (words.has(ci ? word.toLowerCase() : word)) push(word, 'kw');
      else if (code[j] === '(') push(word, 'fn');
      else plain += word;
      i = j;
    } else {
      plain += c;
      i++;
    }
  }
  flush();
  return out;
}
