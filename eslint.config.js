import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'docs-site/**',
      'themes/**',
      'coverage/**',
      'node_modules/**',
      '_archive/**',
      'storybook-static/**',
      // 第三方 vendor：原样保留上游代码，不按本项目的规则改写
      'book-library/vendor/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  {
    // Node 侧脚本与配置文件
    files: ['scripts/**/*.mjs', '*.config.js', '*.config.ts', 'eslint.config.js'],
    languageOptions: {
      globals: {
        process: 'readonly',
        console: 'readonly',
        URL: 'readonly',
        Blob: 'readonly',
        document: 'readonly',
        window: 'readonly',
        // 同步脚本跑在 Node 26：这些是内置全局，不是漏写的依赖
        Buffer: 'readonly',
        fetch: 'readonly',
        AbortSignal: 'readonly',
        URLSearchParams: 'readonly',
      },
    },
  },
);
