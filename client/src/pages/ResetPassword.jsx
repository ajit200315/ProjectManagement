import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { authApi, ApiError } from "../api/client.js";

const ResetPassword = () => {
  const { resetToken } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState({ password: "", confirm: "" });
  const [error, setError] = useState("");
  const [fields, setFields] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setFields({});

    if (form.password !== form.confirm) {
      setError("The two passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      await authApi.resetPassword(resetToken, form.password);
      navigate("/login", {
        replace: true,
        state: { notice: "Password updated. Sign in with your new password." },
      });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        setFields(err.fields);
      } else {
        setError("Could not reach the server.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="shell">
      <div className="card">
        <h1>Choose a new password</h1>

        <form onSubmit={handleSubmit} noValidate>
          {error && <p className="alert">{error}</p>}

          <label htmlFor="password">New password</label>
          <input
            id="password"
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            autoComplete="new-password"
            required
          />
          <small className="muted">At least 8 characters.</small>
          {fields.newPassword && (
            <small className="field-error">{fields.newPassword}</small>
          )}

          <label htmlFor="confirm">Confirm new password</label>
          <input
            id="confirm"
            type="password"
            value={form.confirm}
            onChange={(e) => setForm({ ...form, confirm: e.target.value })}
            autoComplete="new-password"
            required
          />

          <button type="submit" disabled={submitting}>
            {submitting ? "Updating…" : "Update password"}
          </button>
        </form>

        <p className="muted">
          <Link to="/login">Back to sign in</Link>
        </p>
      </div>
    </main>
  );
};

export default ResetPassword;
