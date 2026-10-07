const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

const ACCESS_KEY = "pm.accessToken";
const REFRESH_KEY = "pm.refreshToken";

export const tokens = {
  get access() {
    return localStorage.getItem(ACCESS_KEY);
  },
  get refresh() {
    return localStorage.getItem(REFRESH_KEY);
  },
  save({ accessToken, refreshToken }) {
    if (accessToken) localStorage.setItem(ACCESS_KEY, accessToken);
    if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

/**
 * Error carrying what the API returned, so a form can show the real
 * message and the per-field errors rather than "request failed".
 */
export class ApiError extends Error {
  constructor(status, message, fieldErrors = []) {
    super(message);
    this.status = status;
    this.fieldErrors = fieldErrors;
  }

  /** Flattens the API's [{ field: msg }] array into { field: msg }. */
  get fields() {
    return Object.assign({}, ...this.fieldErrors);
  }
}

const parse = async (res) => {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(
      res.status,
      body.message || `Request failed with ${res.status}`,
      Array.isArray(body.errors) ? body.errors : [],
    );
  }
  return body.data;
};

const send = (path, { method = "GET", body, token } = {}) =>
  fetch(`${BASE_URL}/api/v1${path}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

// Collapses parallel 401s into one refresh so six widgets mounting at
// once don't fire six refreshes and invalidate each other's token.
let refreshing = null;

const refreshAccessToken = async () => {
  const refreshToken = tokens.refresh;
  if (!refreshToken) return null;

  refreshing ??= (async () => {
    try {
      const res = await send("/auth/refresh-token", {
        method: "POST",
        body: { refreshToken },
      });
      const data = await parse(res);
      tokens.save(data);
      return data.accessToken;
    } catch {
      tokens.clear();
      return null;
    } finally {
      refreshing = null;
    }
  })();

  return refreshing;
};

/**
 * Calls the API with the stored access token. On a 401 it refreshes once
 * and retries, so a user whose token expired mid-session is not bounced
 * to the login screen.
 */
export const api = async (path, options = {}) => {
  const { auth = true, ...rest } = options;

  let res = await send(path, {
    ...rest,
    token: auth ? tokens.access : undefined,
  });

  if (res.status === 401 && auth && tokens.refresh) {
    const fresh = await refreshAccessToken();
    if (fresh) {
      res = await send(path, { ...rest, token: fresh });
    }
  }

  return parse(res);
};

export const authApi = {
  register: (payload) =>
    api("/auth/register", { method: "POST", body: payload, auth: false }),

  login: (payload) =>
    api("/auth/login", { method: "POST", body: payload, auth: false }),

  logout: () => api("/auth/logout", { method: "POST" }),

  currentUser: () => api("/auth/current-user"),

  changePassword: (payload) =>
    api("/auth/change-password", { method: "POST", body: payload }),

  forgotPassword: (email) =>
    api("/auth/forgot-password", {
      method: "POST",
      body: { email },
      auth: false,
    }),
};

export const projectApi = {
  list: () => api("/projects"),
  create: (payload) => api("/projects", { method: "POST", body: payload }),
};
