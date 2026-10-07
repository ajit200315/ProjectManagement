import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The module keeps a single-flight refresh promise at module scope, so each
 * test needs its own copy or that state leaks between them.
 */
const freshClient = async () => {
  vi.resetModules();
  return import("./client.js");
};

const jsonResponse = (status, body) => ({
  ok: status < 400,
  status,
  json: async () => body,
});

const envelope = (data) => ({
  statusCode: 200,
  data,
  message: "Success",
  success: true,
});

describe("api", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("unwraps the response envelope and returns only data", async () => {
    const { api } = await freshClient();
    global.fetch = vi.fn(async () =>
      jsonResponse(200, envelope({ name: "Apollo" })),
    );

    await expect(api("/projects")).resolves.toEqual({ name: "Apollo" });
  });

  it("sends the stored access token", async () => {
    const { api, tokens } = await freshClient();
    tokens.save({ accessToken: "abc" });
    global.fetch = vi.fn(async () => jsonResponse(200, envelope(null)));

    await api("/projects");

    const [, options] = global.fetch.mock.calls[0];
    expect(options.headers.Authorization).toBe("Bearer abc");
  });

  it("uses relative URLs so requests go to the serving origin", async () => {
    const { api } = await freshClient();
    global.fetch = vi.fn(async () => jsonResponse(200, envelope(null)));

    await api("/projects");

    expect(global.fetch.mock.calls[0][0]).toBe("/api/v1/projects");
  });

  it("throws an ApiError carrying the message and the field errors", async () => {
    const { api, ApiError } = await freshClient();
    global.fetch = vi.fn(async () =>
      jsonResponse(422, {
        message: "Received data is not valid",
        errors: [{ password: "Too short" }, { email: "Invalid" }],
      }),
    );

    const error = await api("/auth/register", { auth: false }).catch((e) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(422);
    expect(error.message).toBe("Received data is not valid");
    // Flattened for direct lookup by field name.
    expect(error.fields).toEqual({ password: "Too short", email: "Invalid" });
  });

  it("refreshes once on a 401 and retries the original request", async () => {
    const { api, tokens } = await freshClient();
    tokens.save({ accessToken: "stale", refreshToken: "good" });

    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(401, { message: "Unauthorized" }))
      .mockResolvedValueOnce(
        jsonResponse(
          200,
          envelope({ accessToken: "fresh", refreshToken: "good2" }),
        ),
      )
      .mockResolvedValueOnce(jsonResponse(200, envelope({ ok: true })));

    await expect(api("/projects")).resolves.toEqual({ ok: true });

    expect(global.fetch).toHaveBeenCalledTimes(3);
    expect(global.fetch.mock.calls[1][0]).toBe("/api/v1/auth/refresh-token");
    // The retry must carry the rotated token, not the stale one.
    expect(global.fetch.mock.calls[2][1].headers.Authorization).toBe(
      "Bearer fresh",
    );
    expect(tokens.access).toBe("fresh");
  });

  it("clears the tokens when the refresh itself fails", async () => {
    const { api, tokens } = await freshClient();
    tokens.save({ accessToken: "stale", refreshToken: "expired" });

    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(401, { message: "Unauthorized" }))
      .mockResolvedValueOnce(jsonResponse(401, { message: "Expired" }));

    await expect(api("/projects")).rejects.toThrow();
    expect(tokens.access).toBeNull();
    expect(tokens.refresh).toBeNull();
  });

  it("collapses parallel 401s into a single refresh", async () => {
    const { api, tokens } = await freshClient();
    tokens.save({ accessToken: "stale", refreshToken: "good" });

    global.fetch = vi.fn(async (url) => {
      if (url.includes("refresh-token")) {
        return jsonResponse(200, envelope({ accessToken: "fresh" }));
      }
      // Anything still presenting the stale token is rejected.
      return jsonResponse(200, envelope({ ok: true }));
    });

    // First two calls 401, which would otherwise trigger two refreshes that
    // invalidate each other's token.
    global.fetch
      .mockResolvedValueOnce(jsonResponse(401, { message: "Unauthorized" }))
      .mockResolvedValueOnce(jsonResponse(401, { message: "Unauthorized" }));

    await Promise.all([api("/projects"), api("/projects")]);

    const refreshCalls = global.fetch.mock.calls.filter(([url]) =>
      url.includes("refresh-token"),
    );
    expect(refreshCalls).toHaveLength(1);
  });

  it("does not attempt a refresh when there is no refresh token", async () => {
    const { api, tokens } = await freshClient();
    tokens.save({ accessToken: "stale" });

    global.fetch = vi.fn(async () =>
      jsonResponse(401, { message: "Unauthorized" }),
    );

    await expect(api("/projects")).rejects.toThrow("Unauthorized");
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});

describe("query strings", () => {
  it("omits empty filter values instead of sending blanks", async () => {
    const { taskApi } = await freshClient();
    global.fetch = vi.fn(async () => jsonResponse(200, envelope(null)));

    await taskApi.list("p1", {
      status: "todo",
      priority: "",
      assignedTo: null,
    });

    expect(global.fetch.mock.calls[0][0]).toBe(
      "/api/v1/projects/p1/tasks?status=todo",
    );
  });

  it("sends no query string at all when nothing is set", async () => {
    const { taskApi } = await freshClient();
    global.fetch = vi.fn(async () => jsonResponse(200, envelope(null)));

    await taskApi.list("p1", {});

    expect(global.fetch.mock.calls[0][0]).toBe("/api/v1/projects/p1/tasks");
  });
});

describe("attachments", () => {
  it("lets the browser set Content-Type so the multipart boundary is included", async () => {
    const { attachmentApi, tokens } = await freshClient();
    tokens.save({ accessToken: "abc" });
    global.fetch = vi.fn(async () =>
      jsonResponse(201, envelope({ _id: "a1" })),
    );

    await attachmentApi.upload("p1", "t1", new File(["x"], "a.txt"));

    const [, options] = global.fetch.mock.calls[0];
    expect(options.body).toBeInstanceOf(FormData);
    expect(options.headers["Content-Type"]).toBeUndefined();
    expect(options.headers.Authorization).toBe("Bearer abc");
  });
});
