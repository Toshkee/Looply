import { findPresets, SERVICE_PRESETS } from '../presets';

describe('service presets', () => {
  test('names are unique and contain no commas (they travel as a comma-separated route param)', () => {
    const names = SERVICE_PRESETS.map((preset) => preset.name);
    expect(new Set(names).size).toBe(names.length);
    expect(names.filter((name) => name.includes(','))).toEqual([]);
  });

  test('finds presets by exact name in the given order and skips unknown ones', () => {
    expect(findPresets(['Spotify', 'Nope', 'Netflix', 'netflix']).map((preset) => preset.name)).toEqual(['Spotify', 'Netflix']);
    expect(findPresets([])).toEqual([]);
  });
});
