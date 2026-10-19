import { SERVICE_PRESETS } from '../presets';
import { findBrand, glyphColorFor, normalizeServiceName } from '../brands';

const slug = (name: string) => findBrand(name)?.slug ?? null;

describe('brand matching', () => {
  test('normalizes names', () => {
    expect(normalizeServiceName('iCloud+')).toEqual({ compact: 'icloudplus', firstWord: 'icloud' });
    expect(normalizeServiceName('  Crnogorski   Telekom ')).toEqual({ compact: 'crnogorskitelekom', firstWord: 'crnogorski' });
  });

  test.each([
    ['Netflix', 'netflix'],
    ['netflix premium', 'netflix'],
    ['Spotify Family', 'spotify'],
    ['YouTube Premium', 'youtube'],
    ['YouTube Music', 'youtubemusic'],
    ['iCloud+', 'icloud'],
    ['Apple TV+', 'appletv'],
    ['Apple One', 'apple'],
    ['Google One', 'google'],
    ['Crnogorski Telekom', 'deutschetelekom'],
    ['Telekom', 'deutschetelekom'],
    ['HBO Max', 'hbomax'],
    ['Max', 'max'],
    ['EA Play', 'ea'],
    ['Uber Eats', 'ubereats'],
    ['Uber One', 'uber'],
    ['Proton VPN', 'protonvpn'],
    ['Proton Mail', 'proton'],
    ['Claude Pro', 'claude'],
    ['PlayStation Plus', 'playstation'],
    ['ChatGPT Plus', 'openai'],
    ['Amazon Prime', 'amazon'],
    ['Prime Video', 'amazon'],
    ['Microsoft 365', 'microsoft'],
    ['Adobe Creative Cloud', 'adobecreativecloud'],
    ['Canva Pro', 'canva'],
    ['Canva', 'canva'],
    ['Xbox Game Pass', 'xbox'],
    ['Nintendo Switch Online', 'nintendoswitch'],
    ['Disney+', 'disneyplus'],
    ['One', 'one'],
    ['m:tel', 'mtel'],
    ['EPCG', 'epcg'],
    ['Steam', 'steam'],
  ])('%s → %s', (name, expected) => expect(slug(name)).toBe(expected));

  test.each(['Teretana Forma', 'Maxi', 'Easy Gym', 'Boxing klub', 'Canvas LMS', 'Steamboat', 'OneDrive', '', '   '])(
    '%p has no logo',
    (name) => expect(slug(name)).toBeNull(),
  );

  test('every preset resolves to a brand through its own name', () => {
    expect(SERVICE_PRESETS.filter((preset) => !findBrand(preset.name)).map((preset) => preset.name)).toEqual([]);
  });

  test('brands without a free logo are drawn as their initial', () => {
    expect(findBrand('Disney+')?.glyph).toBeNull();
    expect(findBrand('Netflix')?.glyph?.viewBox).toBe('0 0 24 24');
    expect(findBrand('Xbox Game Pass')?.glyph?.viewBox).toBe('0 0 32 32');
  });

  test('glyph color keeps contrast on light brand colors', () => {
    expect(glyphColorFor('#FFFC00')).toBe('#17140F');
    expect(glyphColorFor('#E50914')).toBe('#FFFFFF');
    expect(glyphColorFor('#000000')).toBe('#FFFFFF');
  });
});
