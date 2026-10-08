import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/auth-context.js";
import { ApiError } from "../api/client.js";
import AuthShell from "../components/AuthShell.jsx";

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
    <AuthShell
      title="Create an account"
      subtitle="Set up a workspace and invite your team."
      footer={
        <>
          Already have an account? <Link to="/login">Sign in</Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate>
        {error && <p>{error}</p>}

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
        {fields.username && <small>{fields.username}</small>}

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
        {fields.email && <small>{fields.email}</small>}

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
        <small>At least 8 characters.</small>
        {fields.password && <small>{fields.password}</small>}

        <button type="submit" disabled={submitting}>
          {submitting ? "Creating…" : "Create account"}
        </button>
      </form>
    </AuthShell>
  );
};

export default Register;
