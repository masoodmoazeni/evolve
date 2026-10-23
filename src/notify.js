import { Capacitor } from '@capacitor/core';

export const isNative = () => Capacitor.isNativePlatform();

// تنظیمات هشدارهای داخل اپ (صدا، لرزش، روشن ماندن صفحه)
export const DEFAULT_NOTIF = { enabled: true, sound: 'ding', volume: 0.7, vibrate: true, keepAwake: true };
