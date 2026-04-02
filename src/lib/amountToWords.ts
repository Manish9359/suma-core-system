const ones = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE',
  'TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'];
const tens = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];

function twoDigit(n: number): string {
  if (n < 20) return ones[n];
  return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
}

function threeDigit(n: number): string {
  if (n === 0) return '';
  if (n < 100) return twoDigit(n);
  return ones[Math.floor(n / 100)] + ' HUNDRED' + (n % 100 ? ' AND ' + twoDigit(n % 100) : '');
}

export function amountToWords(amount: number): string {
  if (amount === 0) return 'ZERO INDIAN RUPEE';
  const intPart = Math.floor(Math.abs(amount));
  const decPart = Math.round((Math.abs(amount) - intPart) * 100);

  // Indian numbering: crore, lakh, thousand, hundred
  const crore = Math.floor(intPart / 10000000);
  const lakh = Math.floor((intPart % 10000000) / 100000);
  const thousand = Math.floor((intPart % 100000) / 1000);
  const hundred = intPart % 1000;

  const parts: string[] = [];
  if (crore) parts.push(threeDigit(crore) + ' CRORE');
  if (lakh) parts.push(twoDigit(lakh) + ' LAKH');
  if (thousand) parts.push(twoDigit(thousand) + ' THOUSAND');
  if (hundred) parts.push(threeDigit(hundred));

  let result = parts.join(', ');
  if (decPart > 0) {
    result += ' POINT ' + twoDigit(decPart);
  }
  result += ' INDIAN RUPEE';
  return result;
}
