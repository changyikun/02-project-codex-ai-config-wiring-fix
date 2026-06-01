import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

if (import.meta.env.DEV && import.meta.hot) {
  console.info('[live-preview] Vite HMR 已连接，等待文件变更...');

  import.meta.hot.on('vite:beforeUpdate', (payload) => {
    const updates = payload.updates.map((update) => update.path).join(', ');
    console.info(`[live-preview] 检测到代码变更: ${updates}`);
  });

  import.meta.hot.on('vite:error', (payload) => {
    console.error('[live-preview] 开发期错误:', payload.err);
  });
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

