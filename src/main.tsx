import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import { BASE_NAME } from './config';

// basename 与 vite.config.ts 的 base 同源于 src/config.ts，
// 保证 GitHub Pages 子路径（/uRead/）下路由与静态资源都不会 404。
ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter basename={BASE_NAME}>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
