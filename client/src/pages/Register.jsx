import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/auth-context.js";
import { ApiError } from "../api/client.js";

const Register = () => {
  const { user, register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    fullName: "",
    username: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [fields, setFields] = useState({});
  const [submitting, setSubmitting] = useState(false);

  if (user) {
    return <Navigate to="/" replace />;
  }

  const update = (event) =>
    setForm({ ...form, [event.target.name]: event.target.value });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setFields({});
    setSubmitting(true);

    try {
      await register({
        ...form,
        // The API rejects a username with any uppercase in it.
        username: form.username.trim().toLowerCase(),
      });
      navigate("/", { replace: true });
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
        <h1>Create an account</h1>

        <form onSubmit={handleSubmit} noValidate>
          {error && <p className="alert">{error}</p>}

          <label htmlFor="fullName">Full name</label>
          <input
            id="fullName"
            name="fullName"
            value={form.fullName}
            onChange={update}
            autoComplete="name"
          />

          <label htmlFor="username">Username</label>
          <input
            id="username"
            name="username"
            value={form.username}
            onChange={update}
            autoComplete="username"
            required
          />
          {fields.username && (
            <small className="field-error">{fields.username}</small>
          )}

          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            value={form.email}
            onChange={update}
            autoComplete="email"
            required
          />
          {fields.email && (
            <small className="field-error">{fields.email}</small>
          )}

          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            value={form.password}
            onChange={update}
            autoComplete="new-password"
            required
          />
          <small className="muted">At least 8 characters.</small>
          {fields.password && (
            <small className="field-error">{fields.password}</small>
          )}

          <button type="submit" disabled={submitting}>
            {submitting ? "Creating…" : "Create account"}
          </button>
        </form>

        <p className="muted">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </main>
  );
};

export default Register;
