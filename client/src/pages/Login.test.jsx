import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import Login from "./Login.jsx";
import { AuthProvider } from "../context/AuthContext.jsx";
import { authApi, ApiError } from "../api/client.js";

vi.mock("../api/client.js", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    authApi: {
      ...actual.authApi,
      login: vi.fn(),
      currentUser: vi.fn(),
    },
  };
});

const renderLogin = () =>
  render(
    <MemoryRouter initialEntries={["/login"]}>
      <AuthProvider>
        <Login />
      </AuthProvider>
    </MemoryRouter>,
  );

const fillAndSubmit = async (user, identifier, password = "password123") => {
  await user.type(screen.getByLabelText(/email or username/i), identifier);
  await user.type(screen.getByLabelText(/^password$/i), password);
  await user.click(screen.getByRole("button", { name: /sign in/i }));
};

describe("Login", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(authApi.login).mockReset();
  });

  it("sends an identifier containing @ as an email", async () => {
    vi.mocked(authApi.login).mockResolvedValue({
      user: { username: "ada" },
      accessToken: "a",
      refreshToken: "r",
    });
    const user = userEvent.setup();
    renderLogin();

    await fillAndSubmit(user, "ada@example.com");

    expect(authApi.login).toHaveBeenCalledWith({
      email: "ada@example.com",
      password: "password123",
    });
  });

  it("sends an identifier without @ as a username", async () => {
    vi.mocked(authApi.login).mockResolvedValue({
      user: { username: "ada" },
      accessToken: "a",
      refreshToken: "r",
    });
    const user = userEvent.setup();
    renderLogin();

    await fillAndSubmit(user, "ada");

    expect(authApi.login).toHaveBeenCalledWith({
      username: "ada",
      password: "password123",
    });
  });

  it("shows the API's message when the credentials are rejected", async () => {
    vi.mocked(authApi.login).mockRejectedValue(
      new ApiError(401, "Invalid credentials"),
    );
    const user = userEvent.setup();
    renderLogin();

    await fillAndSubmit(user, "ada", "wrong");

    expect(await screen.findByText("Invalid credentials")).toBeInTheDocument();
  });

  it("explains a network failure rather than showing a raw error", async () => {
    vi.mocked(authApi.login).mockRejectedValue(new TypeError("fetch failed"));
    const user = userEvent.setup();
    renderLogin();

    await fillAndSubmit(user, "ada");

    expect(
      await screen.findByText(/could not reach the server/i),
    ).toBeInTheDocument();
  });

  it("stores the tokens returned by a successful sign in", async () => {
    vi.mocked(authApi.login).mockResolvedValue({
      user: { username: "ada" },
      accessToken: "access-1",
      refreshToken: "refresh-1",
    });
    const user = userEvent.setup();
    renderLogin();

    await fillAndSubmit(user, "ada");

    expect(localStorage.getItem("pm.accessToken")).toBe("access-1");
    expect(localStorage.getItem("pm.refreshToken")).toBe("refresh-1");
  });
});
