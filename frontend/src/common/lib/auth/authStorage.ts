import { type MeInfo } from '@/entities/user/types';

const ACCESS_TOKEN_KEY = 'token';
const REFRESH_TOKEN_KEY = 'refreshToken';
const PERSISTED_AUTH_ME_INFO_KEY = 'twistersPersistedAuthMeInfo';
const EPHEMERAL_AUTH_SNAPSHOT_KEY = 'twistersEphemeralAuthSnapshot';
const AUTH_SYNC_CHANNEL_NAME = 'twisters-auth-sync';

export interface AuthSessionSnapshot {
  accessToken: string;
  refreshToken: string;
  rememberMe: boolean;
}

export interface StoredAuthSnapshot {
  session: AuthSessionSnapshot;
  meInfo: MeInfo | null;
}

type AuthSyncEvent =
  | { type: 'session-update'; snapshot: StoredAuthSnapshot }
  | { type: 'session-clear' };

type AuthSyncMessage =
  | {
      type: 'session-update';
      senderId: string;
      snapshot: StoredAuthSnapshot;
    }
  | {
      type: 'session-clear';
      senderId: string;
    }
  | {
      type: 'session-request';
      senderId: string;
      requestId: string;
    }
  | {
      type: 'session-response';
      senderId: string;
      requestId: string;
      snapshot: StoredAuthSnapshot;
    };

type AuthSyncListener = (event: AuthSyncEvent) => void;

const tabId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const listeners = new Set<AuthSyncListener>();
const pendingSessionRequests = new Map<string, (snapshot: StoredAuthSnapshot | null) => void>();
let authSyncChannel: BroadcastChannel | null = null;

const createRequestId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const readPersistentAuthSnapshot = (): StoredAuthSnapshot | null => {
  const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!accessToken || !refreshToken) {
    return null;
  }

  const persistedMeInfo = (() => {
    try {
      const rawValue = localStorage.getItem(PERSISTED_AUTH_ME_INFO_KEY);
      if (!rawValue) {
        return null;
      }

      const parsedValue = JSON.parse(rawValue);
      return parsedValue && typeof parsedValue === 'object' ? (parsedValue as MeInfo) : null;
    } catch {
      return null;
    }
  })();

  return {
    session: {
      accessToken,
      refreshToken,
      rememberMe: true,
    },
    meInfo: persistedMeInfo,
  };
};

const parseStoredAuthSnapshot = (rawValue: string | null): StoredAuthSnapshot | null => {
  if (!rawValue) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(rawValue) as {
      session?: {
        accessToken?: unknown;
        refreshToken?: unknown;
        rememberMe?: unknown;
      };
      meInfo?: unknown;
    };

    if (!parsedValue || typeof parsedValue !== 'object') {
      return null;
    }

    const session = parsedValue.session;
    if (
      !session ||
      typeof session !== 'object' ||
      typeof session.accessToken !== 'string' ||
      typeof session.refreshToken !== 'string' ||
      typeof session.rememberMe !== 'boolean'
    ) {
      return null;
    }

    const meInfoCandidate = parsedValue.meInfo;
    const meInfo =
      meInfoCandidate && typeof meInfoCandidate === 'object'
        ? (meInfoCandidate as MeInfo)
        : null;

    return {
      session: {
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        rememberMe: session.rememberMe,
      },
      meInfo,
    };
  } catch {
    return null;
  }
};

const readEphemeralAuthSnapshot = (): StoredAuthSnapshot | null => {
  return parseStoredAuthSnapshot(sessionStorage.getItem(EPHEMERAL_AUTH_SNAPSHOT_KEY));
};

const writeEphemeralAuthSnapshot = (snapshot: StoredAuthSnapshot) => {
  sessionStorage.setItem(EPHEMERAL_AUTH_SNAPSHOT_KEY, JSON.stringify(snapshot));
};

const clearPersistentAuthTokens = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(PERSISTED_AUTH_ME_INFO_KEY);
};

const clearEphemeralAuthSnapshot = () => {
  sessionStorage.removeItem(EPHEMERAL_AUTH_SNAPSHOT_KEY);
};

const emitAuthSyncEvent = (event: AuthSyncEvent) => {
  listeners.forEach((listener) => {
    listener(event);
  });
};

const handleAuthSyncMessage = (message: AuthSyncMessage) => {
  if (message.senderId === tabId) {
    return;
  }

  if (message.type === 'session-request') {
    const snapshot = readEphemeralAuthSnapshot();
    if (!snapshot || snapshot.session.rememberMe) {
      return;
    }

    authSyncChannel?.postMessage({
      type: 'session-response',
      senderId: tabId,
      requestId: message.requestId,
      snapshot,
    } satisfies AuthSyncMessage);
    return;
  }

  if (message.type === 'session-response') {
    const resolver = pendingSessionRequests.get(message.requestId);
    if (!resolver) {
      return;
    }

    pendingSessionRequests.delete(message.requestId);
    resolver(message.snapshot);
    return;
  }

  if (message.type === 'session-clear') {
    clearPersistentAuthTokens();
    clearEphemeralAuthSnapshot();
    emitAuthSyncEvent({ type: 'session-clear' });
    return;
  }

  if (message.snapshot.session.rememberMe) {
    localStorage.setItem(ACCESS_TOKEN_KEY, message.snapshot.session.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, message.snapshot.session.refreshToken);
    clearEphemeralAuthSnapshot();
  } else {
    clearPersistentAuthTokens();
    writeEphemeralAuthSnapshot(message.snapshot);
  }

  emitAuthSyncEvent({
    type: 'session-update',
    snapshot: message.snapshot,
  });
};

const ensureAuthSyncChannel = () => {
  if (typeof BroadcastChannel === 'undefined') {
    return null;
  }

  if (!authSyncChannel) {
    authSyncChannel = new BroadcastChannel(AUTH_SYNC_CHANNEL_NAME);
    authSyncChannel.addEventListener('message', (event: MessageEvent<AuthSyncMessage>) => {
      handleAuthSyncMessage(event.data);
    });
  }

  return authSyncChannel;
};

export const getStoredAuthSnapshot = () => {
  return readEphemeralAuthSnapshot() ?? readPersistentAuthSnapshot();
};

export const getAccessToken = () => {
  return getStoredAuthSnapshot()?.session.accessToken ?? null;
};

export const getRefreshToken = () => {
  return getStoredAuthSnapshot()?.session.refreshToken ?? null;
};

export const hasStoredAuthSession = () => {
  return getStoredAuthSnapshot() !== null;
};

export const subscribeToAuthSync = (listener: AuthSyncListener) => {
  ensureAuthSyncChannel();
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
};

export const setAuthSnapshot = (
  snapshot: StoredAuthSnapshot,
  options?: {
    broadcast?: boolean;
  },
) => {
  const shouldBroadcast = options?.broadcast !== false;

  if (snapshot.session.rememberMe) {
    localStorage.setItem(ACCESS_TOKEN_KEY, snapshot.session.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, snapshot.session.refreshToken);
    if (snapshot.meInfo) {
      localStorage.setItem(PERSISTED_AUTH_ME_INFO_KEY, JSON.stringify(snapshot.meInfo));
    } else {
      localStorage.removeItem(PERSISTED_AUTH_ME_INFO_KEY);
    }
    clearEphemeralAuthSnapshot();
  } else {
    clearPersistentAuthTokens();
    writeEphemeralAuthSnapshot(snapshot);
  }

  emitAuthSyncEvent({
    type: 'session-update',
    snapshot,
  });

  if (shouldBroadcast) {
    ensureAuthSyncChannel()?.postMessage({
      type: 'session-update',
      senderId: tabId,
      snapshot,
    } satisfies AuthSyncMessage);
  }
};

export const setAuthTokens = (token: string, refreshToken: string, rememberMe: boolean) => {
  const currentSnapshot = getStoredAuthSnapshot();

  setAuthSnapshot(
    {
      session: {
        accessToken: token,
        refreshToken,
        rememberMe,
      },
      meInfo: rememberMe ? null : currentSnapshot?.meInfo ?? null,
    },
    { broadcast: false },
  );
};

export const setAuthTokensPreservingStorage = (token: string, refreshToken: string) => {
  const currentSnapshot = getStoredAuthSnapshot();
  const rememberMe = currentSnapshot?.session.rememberMe ?? true;

  if (rememberMe) {
    setAuthSnapshot({
      session: {
        accessToken: token,
        refreshToken,
        rememberMe: true,
      },
      meInfo: currentSnapshot?.meInfo ?? null,
    });
    return;
  }

  setAuthSnapshot({
    session: {
      accessToken: token,
      refreshToken,
      rememberMe,
    },
    meInfo: currentSnapshot?.meInfo ?? null,
  });
};

export const setAccessToken = (token: string, rememberMe: boolean) => {
  const currentSnapshot = getStoredAuthSnapshot();
  const refreshToken = currentSnapshot?.session.refreshToken;
  if (!refreshToken) {
    return;
  }

  setAuthSnapshot(
    {
      session: {
        accessToken: token,
        refreshToken,
        rememberMe,
      },
      meInfo: rememberMe ? null : currentSnapshot?.meInfo ?? null,
    },
    { broadcast: false },
  );
};

export const clearAccessToken = (options?: { broadcast?: boolean }) => {
  const shouldBroadcast = options?.broadcast !== false;
  clearPersistentAuthTokens();
  clearEphemeralAuthSnapshot();
  emitAuthSyncEvent({ type: 'session-clear' });

  if (shouldBroadcast) {
    ensureAuthSyncChannel()?.postMessage({
      type: 'session-clear',
      senderId: tabId,
    } satisfies AuthSyncMessage);
  }
};

export const requestAuthSnapshotFromPeers = (timeoutMs = 500) => {
  const channel = ensureAuthSyncChannel();
  if (!channel) {
    return Promise.resolve<StoredAuthSnapshot | null>(null);
  }

  const requestId = createRequestId();

  return new Promise<StoredAuthSnapshot | null>((resolve) => {
    const timeoutId = window.setTimeout(() => {
      pendingSessionRequests.delete(requestId);
      resolve(null);
    }, timeoutMs);

    pendingSessionRequests.set(requestId, (snapshot) => {
      window.clearTimeout(timeoutId);
      resolve(snapshot);
    });

    channel.postMessage({
      type: 'session-request',
      senderId: tabId,
      requestId,
    } satisfies AuthSyncMessage);
  });
};
