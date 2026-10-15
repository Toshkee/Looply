// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', '.expo/*', 'node_modules/*'],
  },
  {
    rules: {
      // i18next's documented API is its default instance (i18n.t, i18n.changeLanguage).
      'import/no-named-as-default-member': 'off',
    },
  },
]);
