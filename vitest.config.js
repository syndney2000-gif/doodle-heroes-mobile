const { defineConfig } = require('vitest/config');
const { transformSync } = require('@babel/core');
const jsx = require('@babel/plugin-transform-react-jsx');
const here = __dirname + '/';
module.exports = defineConfig({
  plugins: [{
    name: 'native-jsx-for-tests',
    transform(code, id) {
      if (id.startsWith(here) && id.endsWith('.js') && !id.includes('node_modules')) {
        return transformSync(code, { filename: id, configFile: false, babelrc: false, plugins: [[jsx, { runtime: 'automatic' }]], sourceMaps: true });
      }
    },
  }],
  resolve: { alias: [
    { find: /^react-native$/, replacement: here + 'tests/mocks/native.js' },
    { find: /^react-native-svg$/, replacement: here + 'tests/mocks/svg.js' },
    { find: /^react-native-safe-area-context$/, replacement: here + 'tests/mocks/safe-area.js' },
    { find: /^@react-native-async-storage\/async-storage$/, replacement: here + 'tests/mocks/storage.js' },
  ] },
  test: { include: ['tests/**/*.test.{ts,tsx,js}'] },
});
