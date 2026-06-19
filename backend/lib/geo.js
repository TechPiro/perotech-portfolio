// Geo helpers: country names, flag emojis, representative coords, and the
// "smart conversion suggestion" generator for the admin dashboard.

let regionNames;
try { regionNames = new Intl.DisplayNames(['en'], { type: 'region' }); } catch (e) { regionNames = null; }

function countryName(code) {
  if (!code) return 'Unknown';
  try { return (regionNames && regionNames.of(code)) || code; } catch (e) { return code; }
}

function flagEmoji(code) {
  if (!code || code.length !== 2) return '🌐';
  return code.toUpperCase().replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
}

// Per-country hints used to tailor conversion advice.
const INFO = {
  US: { currency: 'USD ($)', lang: 'English', tz: 'ET/PT', pay: 'cards, PayPal, Apple Pay' },
  GB: { currency: 'GBP (£)', lang: 'English', tz: 'GMT', pay: 'cards, PayPal' },
  CA: { currency: 'CAD ($)', lang: 'English/French', tz: 'ET/PT', pay: 'cards, PayPal' },
  AU: { currency: 'AUD ($)', lang: 'English', tz: 'AEST', pay: 'cards, PayPal, BNPL' },
  DE: { currency: 'EUR (€)', lang: 'German', tz: 'CET', pay: 'SEPA, PayPal, Klarna' },
  FR: { currency: 'EUR (€)', lang: 'French', tz: 'CET', pay: 'cards, SEPA' },
  IN: { currency: 'INR (₹)', lang: 'English/Hindi', tz: 'IST', pay: 'UPI, cards, wallets' },
  NG: { currency: 'NGN (₦)', lang: 'English', tz: 'WAT', pay: 'cards, bank transfer, Paystack/Flutterwave' },
  BR: { currency: 'BRL (R$)', lang: 'Portuguese', tz: 'BRT', pay: 'Pix, boleto, cards' },
  JP: { currency: 'JPY (¥)', lang: 'Japanese', tz: 'JST', pay: 'cards, konbini' },
  ZA: { currency: 'ZAR (R)', lang: 'English', tz: 'SAST', pay: 'cards, EFT' },
  AE: { currency: 'AED (د.إ)', lang: 'English/Arabic', tz: 'GST', pay: 'cards, Apple Pay' },
};

function suggestionFor(country) {
  if (!country) {
    return { headline: 'Not enough location data yet', tips: ['Once visitors arrive, you’ll get tailored conversion tips for your top country here.'] };
  }
  const info = INFO[country.code] || { currency: 'local currency', lang: 'English', tz: 'their timezone', pay: 'local payment methods' };
  const name = country.name;
  const tips = [
    `Show prices in <b>${info.currency}</b> — localized pricing can lift checkout conversion by 15–30%.`,
    `Offer <b>${info.pay}</b> at checkout, the payment methods ${name} buyers expect.`,
    `Schedule your newsletter & launches for <b>${info.tz}</b> business hours so they land at the top of the inbox.`,
    info.lang && info.lang !== 'English'
      ? `Add a <b>${info.lang}</b> landing page (or auto-translate) — native-language pages convert far better.`
      : `Lead with social proof from ${name} customers (logos, testimonials, “trusted by…”).`,
    `Run a geo-targeted offer: a limited-time discount for ${name} visitors to turn this traffic into first sales.`,
  ];
  return { headline: `${country.pct}% of your visitors are from ${name} ${flagEmoji(country.code)}`, tips };
}

module.exports = { countryName, flagEmoji, suggestionFor };
