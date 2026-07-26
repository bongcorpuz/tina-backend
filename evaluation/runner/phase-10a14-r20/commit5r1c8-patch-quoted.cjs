// PHASE-10A14-R20 COMMIT 5R1-C8 — patch helper: widen quotation-operation detection.
// Text operations over a quoted term ("count the letters in ...", "format the words ...",
// "repeat the phrase ...", "alphabetize the words ...") are metalinguistic actions on
// text, not tax questions. Plural forms were previously unmatched.
const fs = require('fs');
const p = 'services/philippine-tax-intent-analyzer.js';
const lines = fs.readFileSync(p, 'utf8').split('\n');
const i = lines.findIndex((l) => l.startsWith('  quotedOnly:'));
if (i < 0) throw new Error('quotedOnly line not found');

lines[i] = '  quotedOnly: /\\b(quote|translate (?:the |radio |")?(?:word|phrase|term|music)\\b'
  + '|count the (?:letters?|words?|occurrences?)'
  + '|how many (?:letters|characters|words|vowels|consonants)'
  + '|number of (?:letters|characters)'
  + '|format the (?:words?|phrase)'
  + '|repeat the (?:words?|phrase)'
  + '|alphabeti[sz]e'
  + '|list the (?:words?|letters)'
  + '|spell|capitali[sz]e|lowercase|uppercase|reverse|sort the words'
  + '|alphabet|proofread|copy the phrase'
  + '|write the (?:word|letters)|type the (?:word|letters)|anagram|palindrome)\\b/,';

fs.writeFileSync(p, lines.join('\n'));
console.log('patched line', i + 1);
console.log(lines[i].slice(0, 120));
