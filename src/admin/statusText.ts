import type { Availability } from '../ai/nano.ts';

export const STATUS_TEXT: Record<Availability, string> = {
  available: 'Ready — Gemini Nano is on this device',
  downloadable: 'Needs a one-time download',
  downloading: 'Downloading…',
  unavailable: 'Not supported on this device — keyword scan only',
  'no-api': 'Prompt API not found — this browser can\'t run Gemini Nano',
};
