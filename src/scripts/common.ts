import { setupRemoteConsole } from './remoteConsole';

// DOMContentLoadedの代わりにloadイベントを使用
window.addEventListener('load', () => {
  initializeAll();
});

async function initializeAll() {
  setupRemoteConsole();
  console.log('phone-log test: app initialized', {
    path: window.location.pathname,
    query: window.location.search,
    ts: new Date().toISOString(),
  });
  console.info('phone-log test: info message');
  console.warn('phone-log test: warn message');
}
