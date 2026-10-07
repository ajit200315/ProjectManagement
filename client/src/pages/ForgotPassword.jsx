import { useState } from "react";
import { Link } from "react-router-dom";
import { authApi } from "../api/client.js";

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
    <main className="shell">
      <div className="card">
        <h1>Reset your password</h1>

        {sent ? (
          <>
            <p className="muted">
              If that email is registered, a reset link is on its way. The link
              is valid for 20 minutes.
            </p>
            <p className="muted">
              <Link to="/login">Back to sign in</Link>
            </p>
          </>
        ) : (
          <>
            <p className="muted">
              We will email you a link to choose a new one.
            </p>
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
            <p className="muted">
              Remembered it? <Link to="/login">Sign in</Link>
            </p>
          </>
        )}
      </div>
    </main>
  );
};

export default ForgotPassword;
