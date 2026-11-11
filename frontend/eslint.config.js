import js from '@eslint/js'
import { defineConfig, globalIgnores } from 'eslint/config'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'
import tseslint from 'typescript-eslint'

const NETWORK_GLOBALS = ['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource']
const NO_NETWORK =
  'Islands never call the network (docs/contracts.md §11): change the real form inputs, then form.requestSubmit().'

// The Vite build writes to ../src/main/webapp/static, outside this directory, so
// `eslint .` never reaches it; the ignores below cover local tool output only.
export default defineConfig([
  globalIgnores(['dist', 'coverage']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.browser,
    },
  },
  {
    // docs/contracts.md §11 ("cách B"): an island only changes real form inputs and calls
    // form.requestSubmit(); it never talks to the network. The rule covers islands and every
    // module they bundle (components, hooks, lib, the 3D scene); tests may stub these globals.
    files: [
      'src/islands/**/*.{ts,tsx}',
      'src/components/**/*.{ts,tsx}',
      'src/hooks/**/*.{ts,tsx}',
      'src/lib/**/*.{ts,tsx}',
      'src/three/**/*.{ts,tsx}',
    ],
    ignores: ['**/*.test.{ts,tsx}'],
    rules: {
      'no-restricted-globals': ['error', ...NETWORK_GLOBALS.map((name) => ({ name, message: NO_NETWORK }))],
      'no-restricted-syntax': [
        'error',
        {
          selector: `MemberExpression[property.name=/^(${[...NETWORK_GLOBALS, 'sendBeacon'].join('|')})$/]`,
          message: NO_NETWORK,
        },
      ],
      'no-restricted-imports': [
        'error',
        { paths: [{ name: 'axios', message: NO_NETWORK }], patterns: [{ group: ['axios/*'], message: NO_NETWORK }] },
      ],
    },
  },
  {
    // shadcn files export their cva variants next to the component (buttonVariants);
    // islands mount once per page and never hot-reload through these files.
    files: ['src/components/ui/**/*.tsx'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
])
