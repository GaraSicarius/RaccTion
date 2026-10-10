import type { Availability } from '../ai/local.ts';

export const STATUS_TEXT: Record<Availability, string> = {
  available: 'Ready — Qwen3 0.6B is running on this device',
  unavailable: 'Local AI server not ready — keyword scan only',
};
