const COMMON_MARATHI_NAMES: Record<string, string> = {
  sumit: 'सुमित',
  amit: 'अमित',
  mangesh: 'मंगेश',
  chandrakant: 'चंद्रकांत',
  khadatkar: 'खडतकर',
  pawar: 'पवार',
  ganesh: 'गणेश',
  suresh: 'सुरेश',
  ramesh: 'रमेश',
  mahesh: 'महेश',
  rajesh: 'राजेश',
  dinesh: 'दिनेश',
  anil: 'अनिल',
  sunil: 'सुनील',
  rahul: 'राहुल',
  rohit: 'रोहित',
  praveen: 'प्रवीण',
  pravin: 'प्रवीण',
  sachin: 'सचिन',
  swapnil: 'स्वप्निल',
  sanjay: 'संजय',
  vijay: 'विजय',
  vinod: 'विनोद',
  vishal: 'विशाल',
  akshay: 'अक्षय',
  nilesh: 'निलेश',
  nitin: 'नितीन',
  deepak: 'दीपक',
  prashant: 'प्रशांत',
  shubham: 'शुभम',
  omkar: 'ओंकार',
  sagar: 'सागर',
  yogesh: 'योगेश',
  santosh: 'संतोष',
  kiran: 'किरण',
  ashok: 'अशोक',
  mohan: 'मोहन',
  soham: 'सोहम',
  tejas: 'तेजस',
  mayur: 'मयूर',
  gaurav: 'गौरव',
  ajay: 'अजय',
  atul: 'अतुल',
  abhishek: 'अभिषेक',
  nikhil: 'निखिल',
  aditya: 'आदित्य',
  atharva: 'अथर्व',
  siddharth: 'सिद्धार्थ',
  shreyas: 'श्रेयस',
  sameer: 'समीर',
  samir: 'समीर',
  shraddha: 'श्रद्धा',
  pooja: 'पूजा',
  puja: 'पूजा',
  neha: 'नेहा',
  priya: 'प्रिया',
  sneha: 'स्नेहा',
  aarti: 'आरती',
  arti: 'आरती',
  swati: 'स्वाती',
  kavita: 'कविता',
  manisha: 'मनीषा',
  rekha: 'रेखा',
  asha: 'आशा',
  seema: 'सीमा',
  meena: 'मीना',
  vaishali: 'वैशाली',
  anjali: 'अंजली',
  pallavi: 'पल्लवी',
  sarika: 'सारिका',
  sonali: 'सोनाली',
  komal: 'कोमल',
  rutuja: 'ऋतुजा',
  pranjali: 'प्रांजली',
};

const VOWELS: Record<string, { independent: string; mark: string }> = {
  aa: { independent: 'आ', mark: 'ा' },
  ai: { independent: 'ऐ', mark: 'ै' },
  au: { independent: 'औ', mark: 'ौ' },
  ee: { independent: 'ई', mark: 'ी' },
  ii: { independent: 'ई', mark: 'ी' },
  oo: { independent: 'ऊ', mark: 'ू' },
  uu: { independent: 'ऊ', mark: 'ू' },
  a: { independent: 'अ', mark: '' },
  e: { independent: 'ए', mark: 'े' },
  i: { independent: 'इ', mark: 'ि' },
  o: { independent: 'ओ', mark: 'ो' },
  u: { independent: 'उ', mark: 'ु' },
};

const CONSONANTS: Record<string, string> = {
  dny: 'ज्ञ',
  gny: 'ज्ञ',
  jny: 'ज्ञ',
  ksh: 'क्ष',
  chh: 'छ',
  kh: 'ख',
  gh: 'घ',
  ch: 'च',
  jh: 'झ',
  th: 'थ',
  dh: 'ध',
  ph: 'फ',
  bh: 'भ',
  sh: 'श',
  k: 'क',
  q: 'क',
  g: 'ग',
  c: 'क',
  j: 'ज',
  z: 'ज',
  t: 'त',
  d: 'द',
  n: 'न',
  p: 'प',
  f: 'फ',
  b: 'ब',
  m: 'म',
  y: 'य',
  r: 'र',
  l: 'ल',
  v: 'व',
  w: 'व',
  s: 'स',
  h: 'ह',
  x: 'क्ष',
};

const vowelTokens = Object.keys(VOWELS).sort((a, b) => b.length - a.length);
const consonantTokens = Object.keys(CONSONANTS).sort((a, b) => b.length - a.length);

const matchToken = (value: string, index: number, tokens: string[]) =>
  tokens.find((token) => value.startsWith(token, index));

const transliterateLatinWord = (word: string) => {
  const normalized = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!normalized) return word;
  if (COMMON_MARATHI_NAMES[normalized]) return COMMON_MARATHI_NAMES[normalized];

  let result = '';
  let index = 0;

  while (index < normalized.length) {
    const vowel = matchToken(normalized, index, vowelTokens);
    if (vowel) {
      result += VOWELS[vowel].independent;
      index += vowel.length;
      continue;
    }

    const consonant = matchToken(normalized, index, consonantTokens);
    if (!consonant) {
      index += 1;
      continue;
    }

    const nextIndex = index + consonant.length;
    const nextVowel = matchToken(normalized, nextIndex, vowelTokens);
    const nextConsonant = matchToken(normalized, nextIndex, consonantTokens);

    if (consonant === 'n' && nextConsonant && /^(k|kh|g|gh|d|dh|t|th)$/.test(nextConsonant)) {
      result += 'ं';
      index = nextIndex;
      continue;
    }

    result += CONSONANTS[consonant];
    if (nextVowel) {
      result += VOWELS[nextVowel].mark;
      index = nextIndex + nextVowel.length;
    } else {
      if (nextConsonant) result += '्';
      index = nextIndex;
    }
  }

  return result || word;
};

export const toMarathiName = (value: string) =>
  value
    .split(/(\s+)/)
    .map((part) => (/^[a-z]+$/i.test(part) ? transliterateLatinWord(part) : part))
    .join('');
