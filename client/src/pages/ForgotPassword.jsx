import { useState } from "react";
import { Link } from "react-router-dom";
import { authApi } from "../api/client.js";
import AuthShell from "../components/AuthShell.jsx";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Reset your password"
      subtitle={
        sent ? undefined : "We will email you a link to choose a new one."
      }
      footer={
        sent ? (
          <Link to="/login">Back to sign in</Link>
        ) : (
          <>
            Remembered it? <Link to="/login">Sign in</Link>
          </>
        )
      }
    >
      {sent ? (
        <p className="notice">
          If that email is registered, a reset link is on its way. The link is
          valid for 20 minutes.
        </p>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          {error && <p className="alert">{error}</p>}

          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />

          <button type="submit" disabled={submitting}>
            {submitting ? "Sending…" : "Send reset link"}
          </button>
        </form>
      )}
    </AuthShell>
  );
};

export default ForgotPassword;
