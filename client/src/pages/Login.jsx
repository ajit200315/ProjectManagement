import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/auth-context.js";
import { ApiError } from "../api/client.js";

const Login = () => {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const notice = location.state?.notice;
  const [form, setForm] = useState({ identifier: "", password: "" });
  const [error, setError] = useState("");
  const [fields, setFields] = useState({});
  const [submitting, setSubmitting] = useState(false);

  if (user) {
    return <Navigate to={location.state?.from ?? "/"} replace />;
  }

  const update = (event) =>
    setForm({ ...form, [event.target.name]: event.target.value });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setFields({});
    setSubmitting(true);

    // The API accepts either, so decide by whether it looks like an email.
    const { identifier, password } = form;
    const credentials = identifier.includes("@")
      ? { email: identifier, password }
      : { username: identifier, password };

    try {
      await login(credentials);
      navigate(location.state?.from ?? "/", { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        setFields(err.fields);
      } else {
        setError("Could not reach the server. Is the API running?");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="shell">
      <div className="card">
        <h1>Sign in</h1>
        <p className="muted">Use your email address or your username.</p>

        <form onSubmit={handleSubmit} noValidate>
          {notice && <p className="notice">{notice}</p>}
          {error && <p className="alert">{error}</p>}

          <label htmlFor="identifier">Email or username</label>
          <input
            id="identifier"
            name="identifier"
            value={form.identifier}
            onChange={update}
            autoComplete="username"
            required
          />
          {(fields.email || fields.username) && (
            <small className="field-error">
              {fields.email ?? fields.username}
            </small>
          )}

          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            value={form.password}
            onChange={update}
            autoComplete="current-password"
            required
          />
          {fields.password && (
            <small className="field-error">{fields.password}</small>
          )}

          <button type="submit" disabled={submitting}>
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="muted">
          No account yet? <Link to="/register">Create one</Link>
        </p>
      </div>
    </main>
  );
};

export default Login;
