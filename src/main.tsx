import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import { BASE_NAME, SITE_BASE } from './config';

// 夜间模式在首屏前恢复，避免先白后黑闪一下。
if (localStorage.getItem('uread:theme') === 'dark') {
  document.documentElement.dataset.theme = 'dark';
}

// 离线外壳：只缓存壳与目录 JSON，音频和书不走 Cache Storage。
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register(`${SITE_BASE}sw.js`, { scope: SITE_BASE });
  });
}

// basename 与 vite.config.ts 的 base 同源于 src/config.ts，
// 保证 GitHub Pages 子路径（/uRead/）下路由与静态资源都不会 404。
ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter basename={BASE_NAME}>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
