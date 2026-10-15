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
  ])('%s → %s', (name, expected) => expect(slug(name)).toBe(expected));

  test.each(['Teretana Forma', 'Maxi', 'Easy Gym', 'Boxing klub', 'ChatGPT Plus', 'Microsoft 365', 'EPCG', '', '   '])(
    '%p has no logo',
    (name) => expect(slug(name)).toBeNull(),
  );

  test('every preset that has a logo resolves through its own name', () => {
    const withLogo = SERVICE_PRESETS.filter((preset) => findBrand(preset.name));
    expect(withLogo.length).toBeGreaterThan(10);
  });

  test('glyph color keeps contrast on light brand colors', () => {
    expect(glyphColorFor('#FFFC00')).toBe('#17140F');
    expect(glyphColorFor('#E50914')).toBe('#FFFFFF');
    expect(glyphColorFor('#000000')).toBe('#FFFFFF');
  });
});
