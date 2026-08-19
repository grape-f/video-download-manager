import { EventEmitter } from 'node:events';
import type { DownloadTask, Settings } from './types';

/**
 * 全局事件总线，用于向后端各模块以及 SSE 推送层广播事件。
 */
export const bus = new EventEmitter();

export function emitTaskUpdated(task: DownloadTask): void {
  bus.emit('task', task);
}

export function emitSettingsUpdated(settings: Settings): void {
  bus.emit('settings', settings);
}

export function emitLog(message: string): void {
  bus.emit('log', message);
}
