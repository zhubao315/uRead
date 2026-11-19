/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Content Edition 设计令牌：数字阅读杂志 / 个人图书馆
        brand: '#2457A6',
        brandDark: '#1C4683',
        brandSoft: '#5B8DEF',
        ink: '#172033',
        body: '#263244',
        accent: '#C58B42',
        page: '#F5F7FA',
        surface: '#FFFFFF',
        line: '#DDE3EA',
        muted: '#64748B',
        // 管理工作台旧令牌保留，避免历史组件变红
        primary: '#3b82f6',
        secondary: '#64748b',
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
      },
    },
  },
  plugins: [],
}