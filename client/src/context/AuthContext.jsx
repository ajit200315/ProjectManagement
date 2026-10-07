import { useCallback, useEffect, useMemo, useState } from "react";
import { authApi, tokens } from "../api/client.js";
import { AuthContext } from "./auth-context.js";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  // Only "loading" if there is a stored token worth checking. Deriving it
  // here rather than in the effect keeps the guard from bouncing a
  // logged-in user to the login screen on first paint.
  const [loading, setLoading] = useState(() => Boolean(tokens.access));

  useEffect(() => {
    if (!tokens.access) return;

    let active = true;
    authApi
      .currentUser()
      .then((data) => active && setUser(data))
      .catch(() => {
        tokens.clear();
        if (active) setUser(null);
      })
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (credentials) => {
    const data = await authApi.login(credentials);
    tokens.save(data);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(
    async (payload) => {
      await authApi.register(payload);
      // Registration does not return tokens, so sign the new user in
      // with the credentials they just gave us.
      return login({ email: payload.email, password: payload.password });
    },
    [login],
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Already invalid server-side; clearing locally is what matters.
    }
    tokens.clear();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, register, logout }),
    [user, loading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
