import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { enableDeviceNotifications, sendMobileTrafficPush, disableDeviceNotifications, notificationSupport } from './notificationService.js';
test('device alerts require explicit permission and opt-in; delivery uses the notification worker', async () => {
  const keys = ['window', 'navigator', 'Notification', 'localStorage'];
  const original = keys.map(key => Object.getOwnPropertyDescriptor(globalThis, key));
  const storage = new Map(), shown = [];
  let prompts = 0;
  const notification = { permission: 'default', requestPermission: async () => { prompts++; notification.permission = 'granted'; return 'granted'; } };
  const registration = { showNotification: async (title, options) => shown.push({ title, options }), getNotifications: async () => [] };
  const navigator = { userAgent: 'desktop', platform: 'MacIntel', maxTouchPoints: 0, serviceWorker: { register: async () => registration, ready: Promise.resolve(registration), getRegistration: async () => registration } };
  const values = { window: { isSecureContext: true, Notification: notification, matchMedia: () => ({ matches: false }) }, navigator, Notification: notification, localStorage: { getItem: k => storage.get(k), setItem: (k,v) => storage.set(k,v), removeItem: k => storage.delete(k) } };
  keys.forEach(key => Object.defineProperty(globalThis, key, { configurable: true, value: values[key] }));
  try {
    assert.equal(await sendMobileTrafficPush(), false);
    assert.equal(prompts, 0, 'background delivery must never open a permission prompt');
    navigator.userAgent = 'iPhone';
    assert.equal(notificationSupport().needsInstall, true);
    assert.equal(await enableDeviceNotifications(), 'unsupported');
    assert.equal(prompts, 0);
    navigator.userAgent = 'desktop';
    assert.equal(await enableDeviceNotifications(), 'granted');
    assert.equal(await sendMobileTrafficPush({ title: 'Traffic test', body: 'Verified route update', data: { url: 'https://untrusted.example' } }), true);
    assert.equal(shown[0].options.icon, '/icons/icon-192.png');
    assert.equal(shown[0].options.data.url, '/traffic-map');
    await disableDeviceNotifications();
    assert.equal(await sendMobileTrafficPush(), false);
    assert.equal(shown.length, 1);
  } finally { keys.forEach((key,i) => { if (original[i]) Object.defineProperty(globalThis,key,original[i]); else delete globalThis[key]; }); }
});
test('notification clicks only open the app traffic map, never payload URLs', async () => {
  const listeners = {}, opened = [];
  vm.runInNewContext(readFileSync(new URL('../../public/sw.js', import.meta.url), 'utf8'), { self: { location: { origin: 'https://traffic.example' }, addEventListener: (name,fn) => { listeners[name] = fn; } }, URL, clients: { matchAll: async () => [], openWindow: async url => opened.push(url) } });
  let completion;
  listeners.notificationclick({ notification: { close() {}, data: { url: 'https://untrusted.example' } }, waitUntil: promise => { completion = promise; } });
  await completion;
  assert.deepEqual(opened, ['https://traffic.example/traffic-map']);
});
