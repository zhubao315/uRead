/**
 * 新版本提示：GitHub Pages 重新部署后，Service Worker 会安装新的应用外壳。
 * 当前页面不会自己跳走（避免打断阅读），只在角落提示，由用户决定何时刷新。
 */
import React, { useEffect, useState } from 'react';

const UpdateNotice: React.FC = () => {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    let alive = true;
    void navigator.serviceWorker.ready.then((registration) => {
      const onUpdateFound = () => {
        const worker = registration.installing;
        if (!worker) return;
        const onStateChange = () => {
          // 已有 controller 说明这是更新而非首次安装。
          if (worker.state === 'installed' && navigator.serviceWorker.controller && alive) {
            setAvailable(true);
          }
        };
        worker.addEventListener('statechange', onStateChange);
      };
      registration.addEventListener('updatefound', onUpdateFound);
      if (registration.waiting && navigator.serviceWorker.controller) setAvailable(true);
    }).catch(() => undefined);
    return () => { alive = false; };
  }, []);

  if (!available) return null;

  return (
    <div role="status" className="fixed bottom-20 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-lg border border-brand/30 bg-surface p-3 text-center text-sm text-navy shadow-raised md:bottom-6">
      <span>uRead 有新版本可用</span>
      <button type="button" onClick={() => window.location.reload()}
        className="ml-3 rounded bg-brand px-3 py-1 text-white hover:bg-brandActive">
        刷新
      </button>
    </div>
  );
};

export default UpdateNotice;
