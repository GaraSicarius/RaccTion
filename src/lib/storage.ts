import { mergeSettings } from './settings.ts';
import type { PinRecord } from './pin.ts';
import type { Profile } from './autofill.ts';
import type { EncryptedProfile } from './profileCrypto.ts';
import type { ScanResult, ScanState, Settings } from './types.ts';

const SETTINGS_KEY = 'settings';
const HISTORY_KEY = 'history';
const PIN_KEY = 'adminPin';
const UNLOCKED_KEY = 'adminUnlocked';
const PROFILE_KEY = 'profile';
const PROFILE_ENC_KEY = 'profileEnc';

export async function getSettings(): Promise<Settings> {
  const data = await chrome.storage.local.get(SETTINGS_KEY);
  return mergeSettings(data[SETTINGS_KEY]);
}

export async function saveSettings(settings: Settings): Promise<void> {
  await chrome.storage.local.set({ [SETTINGS_KEY]: settings });
}

export async function getHistory(): Promise<ScanResult[]> {
  const data = await chrome.storage.local.get(HISTORY_KEY);
  return Array.isArray(data[HISTORY_KEY]) ? (data[HISTORY_KEY] as ScanResult[]) : [];
}

export async function addHistory(result: ScanResult): Promise<void> {
  const settings = await getSettings();
  if (!settings.history.enabled) return;
  const list = [result, ...(await getHistory())].slice(0, settings.history.max);
  await chrome.storage.local.set({ [HISTORY_KEY]: list });
}

export async function deleteHistoryItem(capturedAt: string): Promise<void> {
  const list = (await getHistory()).filter(r => r.capturedAt !== capturedAt);
  await chrome.storage.local.set({ [HISTORY_KEY]: list });
}

export async function clearHistory(): Promise<void> {
  await chrome.storage.local.set({ [HISTORY_KEY]: [] });
}

export const scanKey = (tabId: number) => `scan:${tabId}`;

export async function getScanState(tabId: number): Promise<ScanState | null> {
  const data = await chrome.storage.session.get(scanKey(tabId));
  return (data[scanKey(tabId)] as ScanState | undefined) ?? null;
}

export async function setScanState(state: ScanState): Promise<void> {
  await chrome.storage.session.set({ [scanKey(state.tabId)]: state });
}

export async function getPinRecord(): Promise<PinRecord | null> {
  const data = await chrome.storage.local.get(PIN_KEY);
  return (data[PIN_KEY] as PinRecord | undefined) ?? null;
}

export async function setPinRecord(record: PinRecord | null): Promise<void> {
  if (record === null) await chrome.storage.local.remove(PIN_KEY);
  else await chrome.storage.local.set({ [PIN_KEY]: record });
}

export async function isAdminUnlocked(): Promise<boolean> {
  const data = await chrome.storage.session.get(UNLOCKED_KEY);
  return data[UNLOCKED_KEY] === true;
}

export async function setAdminUnlocked(unlocked: boolean): Promise<void> {
  if (unlocked) await chrome.storage.session.set({ [UNLOCKED_KEY]: true });
  else await chrome.storage.session.remove(UNLOCKED_KEY);
}

// Approved-autofill profile. Plaintext lives in session storage only;
// profileEnc (encrypted) is the optional persistent copy in local storage.
export async function getProfile(): Promise<Profile | null> {
  const data = await chrome.storage.session.get(PROFILE_KEY);
  const p = data[PROFILE_KEY] as Profile | undefined;
  return p && typeof p === 'object' ? p : null;
}

export async function setProfile(profile: Profile | null): Promise<void> {
  if (profile === null) await chrome.storage.session.remove(PROFILE_KEY);
  else await chrome.storage.session.set({ [PROFILE_KEY]: profile });
}

export async function getProfileEnc(): Promise<EncryptedProfile | null> {
  const data = await chrome.storage.local.get(PROFILE_ENC_KEY);
  const r = data[PROFILE_ENC_KEY] as EncryptedProfile | undefined;
  return r && typeof r.salt === 'string' && typeof r.iv === 'string' && typeof r.data === 'string' ? r : null;
}

export async function setProfileEnc(record: EncryptedProfile | null): Promise<void> {
  if (record === null) await chrome.storage.local.remove(PROFILE_ENC_KEY);
  else await chrome.storage.local.set({ [PROFILE_ENC_KEY]: record });
}
