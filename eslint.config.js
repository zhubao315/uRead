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
    files: ['public/**/*.js'],
    languageOptions: {
      globals: {
        self: 'readonly',
        caches: 'readonly',
        fetch: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        Request: 'readonly',
        Response: 'readonly',
        // 统一埋点脚本运行在浏览器主线程
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        MutationObserver: 'readonly',
        setTimeout: 'readonly',
      },
    },
    rules: {
      // PostHog 官方 snippet 为压缩后的逗号表达式，按原样保留
      '@typescript-eslint/no-unused-expressions': 'off',
      'no-unused-expressions': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' },
      ],
    },
  },
  {
    // Node 侧脚本与配置文件
    files: ['scripts/**/*.mjs', '*.config.js', '*.config.ts', 'eslint.config.js'],
    languageOptions: {
      globals: {
        process: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
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
