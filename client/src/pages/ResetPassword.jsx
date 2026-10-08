import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { authApi, ApiError } from "../api/client.js";
import AuthShell from "../components/AuthShell.jsx";

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
    <AuthShell
      title="Choose a new password"
      footer={<Link to="/login">Back to sign in</Link>}
    >
      <form onSubmit={handleSubmit} noValidate>
        {error && <p>{error}</p>}

        <label htmlFor="password">New password</label>
        <input
          id="password"
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          autoComplete="new-password"
          required
        />
        <small>At least 8 characters.</small>
        {fields.newPassword && <small>{fields.newPassword}</small>}

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
    </AuthShell>
  );
};

export default ResetPassword;
