/**
 * Empty by default, so every request is relative and goes to whatever origin
 * served the app. That is what makes the production build work when Express
 * serves the client itself, and it is proxied to the backend in development
 * (see vite.config.js).
 *
 * Only set VITE_API_URL if the API lives on a different domain than the
 * client, and remember it is baked in at build time.
 */
const BASE_URL = import.meta.env.VITE_API_URL ?? "";

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

  resetPassword: (resetToken, newPassword) =>
    api(`/auth/reset-password/${resetToken}`, {
      method: "POST",
      body: { newPassword },
      auth: false,
    }),

  verifyEmail: (verificationToken) =>
    api(`/auth/verify-email/${verificationToken}`, { auth: false }),

  resendVerification: () =>
    api("/auth/resend-email-verification", { method: "POST" }),
};

export const noteApi = {
  list: (projectId, params) => api(`/projects/${projectId}/notes${qs(params)}`),
  create: (projectId, content) =>
    api(`/projects/${projectId}/notes`, {
      method: "POST",
      body: { content },
    }),
  update: (projectId, noteId, content) =>
    api(`/projects/${projectId}/notes/${noteId}`, {
      method: "PUT",
      body: { content },
    }),
  remove: (projectId, noteId) =>
    api(`/projects/${projectId}/notes/${noteId}`, { method: "DELETE" }),
};

/** Drops empty values so they do not show up as `?status=` in the URL. */
const qs = (params = {}) => {
  const entries = Object.entries(params).filter(
    ([, value]) => value !== undefined && value !== null && value !== "",
  );
  const query = new URLSearchParams(entries).toString();
  return query ? `?${query}` : "";
};

export const projectApi = {
  list: (params) => api(`/projects${qs(params)}`),
  get: (projectId) => api(`/projects/${projectId}`),
  create: (payload) => api("/projects", { method: "POST", body: payload }),
  update: (projectId, payload) =>
    api(`/projects/${projectId}`, { method: "PUT", body: payload }),
  remove: (projectId) => api(`/projects/${projectId}`, { method: "DELETE" }),
};

export const memberApi = {
  list: (projectId) => api(`/projects/${projectId}/members`),
  add: (projectId, payload) =>
    api(`/projects/${projectId}/members`, { method: "POST", body: payload }),
  updateRole: (projectId, userId, newRole) =>
    api(`/projects/${projectId}/members/${userId}`, {
      method: "PUT",
      body: { newRole },
    }),
  remove: (projectId, userId) =>
    api(`/projects/${projectId}/members/${userId}`, { method: "DELETE" }),
};

export const taskApi = {
  list: (projectId, params) => api(`/projects/${projectId}/tasks${qs(params)}`),
  get: (projectId, taskId) => api(`/projects/${projectId}/tasks/${taskId}`),
  create: (projectId, payload) =>
    api(`/projects/${projectId}/tasks`, { method: "POST", body: payload }),
  update: (projectId, taskId, payload) =>
    api(`/projects/${projectId}/tasks/${taskId}`, {
      method: "PUT",
      body: payload,
    }),
  remove: (projectId, taskId) =>
    api(`/projects/${projectId}/tasks/${taskId}`, { method: "DELETE" }),

  addSubTask: (projectId, taskId, title) =>
    api(`/projects/${projectId}/tasks/${taskId}/subtasks`, {
      method: "POST",
      body: { title },
    }),
  updateSubTask: (projectId, taskId, subTaskId, payload) =>
    api(`/projects/${projectId}/tasks/${taskId}/subtasks/${subTaskId}`, {
      method: "PUT",
      body: payload,
    }),
  removeSubTask: (projectId, taskId, subTaskId) =>
    api(`/projects/${projectId}/tasks/${taskId}/subtasks/${subTaskId}`, {
      method: "DELETE",
    }),
};

export const attachmentApi = {
  list: (projectId, taskId) =>
    api(`/projects/${projectId}/tasks/${taskId}/attachments`),

  /**
   * Sends multipart/form-data. The Content-Type header is deliberately not
   * set: the browser must add it itself so it can include the multipart
   * boundary, which we cannot know.
   */
  upload: async (projectId, taskId, file) => {
    const body = new FormData();
    body.append("file", file);

    const res = await fetch(
      `${BASE_URL}/api/v1/projects/${projectId}/tasks/${taskId}/attachments`,
      {
        method: "POST",
        headers: tokens.access
          ? { Authorization: `Bearer ${tokens.access}` }
          : {},
        body,
      },
    );
    return parse(res);
  },

  remove: (projectId, taskId, attachmentId) =>
    api(`/projects/${projectId}/tasks/${taskId}/attachments/${attachmentId}`, {
      method: "DELETE",
    }),

  /**
   * The download route needs an Authorization header, so a plain link cannot
   * fetch it. Pull the bytes, hand them to the browser as a blob, and revoke
   * the object URL afterwards so it is not retained for the session.
   */
  download: async (projectId, taskId, attachment) => {
    const res = await fetch(
      `${BASE_URL}/api/v1/projects/${projectId}/tasks/${taskId}/attachments/${attachment._id}`,
      {
        headers: tokens.access
          ? { Authorization: `Bearer ${tokens.access}` }
          : {},
      },
    );

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new ApiError(res.status, body.message || "Download failed");
    }

    const url = URL.createObjectURL(await res.blob());
    const link = document.createElement("a");
    link.href = url;
    link.download = attachment.filename;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  },
};

export const TASK_PRIORITY = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  URGENT: "urgent",
};

export const PRIORITY_LABEL = {
  [TASK_PRIORITY.LOW]: "Low",
  [TASK_PRIORITY.MEDIUM]: "Medium",
  [TASK_PRIORITY.HIGH]: "High",
  [TASK_PRIORITY.URGENT]: "Urgent",
};

export const ROLES = {
  ADMIN: "admin",
  PROJECT_ADMIN: "project_admin",
  MEMBER: "member",
};

export const TASK_STATUS = {
  TODO: "todo",
  IN_PROGRESS: "in_progress",
  DONE: "done",
};

export const STATUS_LABEL = {
  [TASK_STATUS.TODO]: "To do",
  [TASK_STATUS.IN_PROGRESS]: "In progress",
  [TASK_STATUS.DONE]: "Done",
};

export const ROLE_LABEL = {
  [ROLES.ADMIN]: "Admin",
  [ROLES.PROJECT_ADMIN]: "Project admin",
  [ROLES.MEMBER]: "Member",
};

/** Mirrors the permissions the API enforces, so the UI hides what would 403. */
export const can = {
  manageProject: (role) => role === ROLES.ADMIN,
  manageMembers: (role) => role === ROLES.ADMIN,
  manageTasks: (role) => role === ROLES.ADMIN || role === ROLES.PROJECT_ADMIN,
  manageNotes: (role) => role === ROLES.ADMIN,
  toggleSubTask: () => true,
};
