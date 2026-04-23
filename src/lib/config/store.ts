import fs from 'node:fs/promises';
import path from 'node:path';
import { app } from 'electron';
import type { AppConfig, ProfileSummary } from '../../shared/types';

const CONFIG_FILE = 'worklog-config.json';

type StoredProfile = {
  id: string;
  name: string;
  config: AppConfig;
};

type ConfigStore = {
  version: 2;
  activeProfileId: string | null;
  profiles: StoredProfile[];
};

const getConfigPath = () => path.join(app.getPath('userData'), CONFIG_FILE);

const normalizeAppConfig = (config: AppConfig): AppConfig => ({
  ...config,
  logsRoot: config.logsRoot?.trim() || 'logs',
  autoPush: config.autoPush ?? true,
  pullBeforeSave: config.pullBeforeSave ?? false,
  allowedRemoteHosts: config.allowedRemoteHosts ?? []
});

const makeId = (): string => `p_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

const normalizeStore = (store: ConfigStore): ConfigStore => {
  const profiles = store.profiles.map((profile) => ({
    ...profile,
    config: normalizeAppConfig(profile.config)
  }));

  const hasActive = profiles.some((p) => p.id === store.activeProfileId);
  return {
    version: 2,
    profiles,
    activeProfileId: hasActive ? store.activeProfileId : (profiles[0]?.id ?? null)
  };
};

const migrateLegacyConfig = (legacy: AppConfig): ConfigStore => {
  const profile: StoredProfile = {
    id: makeId(),
    name: 'Default',
    config: normalizeAppConfig(legacy)
  };

  return {
    version: 2,
    activeProfileId: profile.id,
    profiles: [profile]
  };
};

const loadStore = async (): Promise<ConfigStore> => {
  try {
    const raw = await fs.readFile(getConfigPath(), 'utf8');
    const parsed = JSON.parse(raw) as ConfigStore | AppConfig;

    if ('version' in parsed && parsed.version === 2) {
      return normalizeStore(parsed);
    }

    if ('repoPath' in parsed && parsed.repoPath && parsed.branch) {
      return migrateLegacyConfig(parsed as AppConfig);
    }

    return { version: 2, activeProfileId: null, profiles: [] };
  } catch {
    return { version: 2, activeProfileId: null, profiles: [] };
  }
};

const saveStore = async (store: ConfigStore): Promise<void> => {
  const target = getConfigPath();
  const normalized = normalizeStore(store);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, JSON.stringify(normalized, null, 2), 'utf8');
};

export const loadConfig = async (): Promise<AppConfig | null> => {
  const store = await loadStore();
  const active = store.profiles.find((p) => p.id === store.activeProfileId);
  if (!active?.config) {
    return null;
  }
  if (!active.config.repoPath || !active.config.branch) {
    return null;
  }
  return active.config;
};

export const saveConfig = async (config: AppConfig): Promise<void> => {
  const store = await loadStore();
  const normalized = normalizeAppConfig(config);

  if (!store.activeProfileId || store.profiles.length === 0) {
    const created: StoredProfile = {
      id: makeId(),
      name: 'Default',
      config: normalized
    };
    await saveStore({
      version: 2,
      activeProfileId: created.id,
      profiles: [created]
    });
    return;
  }

  const profiles = store.profiles.map((profile) =>
    profile.id === store.activeProfileId ? { ...profile, config: normalized } : profile
  );

  await saveStore({ ...store, profiles });
};

export const listProfiles = async (): Promise<{ profiles: ProfileSummary[]; activeProfileId?: string }> => {
  const store = await loadStore();
  return {
    profiles: store.profiles.map((profile) => ({ id: profile.id, name: profile.name })),
    activeProfileId: store.activeProfileId ?? undefined
  };
};

export const createProfile = async (name: string): Promise<{ profiles: ProfileSummary[]; activeProfileId?: string }> => {
  const store = await loadStore();
  const current = store.profiles.find((p) => p.id === store.activeProfileId)?.config;

  const baseConfig: AppConfig = current ?? {
    repoPath: '',
    branch: 'main',
    logsRoot: 'logs',
    autoPush: false,
    pullBeforeSave: false,
    allowedRemoteHosts: []
  };

  const created: StoredProfile = {
    id: makeId(),
    name: name.trim() || `Profile ${store.profiles.length + 1}`,
    config: normalizeAppConfig(baseConfig)
  };

  const nextStore: ConfigStore = {
    ...store,
    activeProfileId: created.id,
    profiles: [...store.profiles, created]
  };
  await saveStore(nextStore);
  return listProfiles();
};

export const switchProfile = async (profileId: string): Promise<void> => {
  const store = await loadStore();
  if (!store.profiles.some((p) => p.id === profileId)) {
    throw new Error('선택한 프로필을 찾을 수 없습니다.');
  }
  await saveStore({ ...store, activeProfileId: profileId });
};

export const deleteProfile = async (profileId: string): Promise<{ profiles: ProfileSummary[]; activeProfileId?: string }> => {
  const store = await loadStore();
  const exists = store.profiles.some((p) => p.id === profileId);
  if (!exists) {
    return listProfiles();
  }

  const profiles = store.profiles.filter((p) => p.id !== profileId);
  const activeProfileId = store.activeProfileId === profileId ? (profiles[0]?.id ?? null) : store.activeProfileId;

  await saveStore({ ...store, profiles, activeProfileId });
  return listProfiles();
};
