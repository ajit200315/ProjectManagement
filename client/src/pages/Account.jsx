import { useState } from "react";
import { authApi, ApiError } from "../api/client.js";
import { useAuth } from "../context/auth-context.js";
import Layout from "../components/Layout.jsx";
import ErrorBanner from "../components/ErrorBanner.jsx";
import Avatar from "../components/Avatar.jsx";
import Icon from "../components/Icon.jsx";

const ChangePassword = () => {
  const [form, setForm] = useState({
    oldPassword: "",
    newPassword: "",
    confirm: "",
  });
  const [error, setError] = useState("");
  const [fields, setFields] = useState({});
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setFields({});
    setDone(false);

    if (form.newPassword !== form.confirm) {
      setError("The two passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      await authApi.changePassword({
        oldPassword: form.oldPassword,
        newPassword: form.newPassword,
      });
      setForm({ oldPassword: "", newPassword: "", confirm: "" });
      setDone(true);
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
    <section className="panel">
      <div className="section-head">
        <h2>Change password</h2>
      </div>

      <form className="stacked" onSubmit={handleSubmit} noValidate>
        <ErrorBanner error={error} onDismiss={() => setError("")} />
        {done && <p className="notice">Password changed.</p>}

        <label htmlFor="oldPassword">Current password</label>
        <input
          id="oldPassword"
          type="password"
          value={form.oldPassword}
          onChange={(e) => setForm({ ...form, oldPassword: e.target.value })}
          autoComplete="current-password"
          required
        />

        <label htmlFor="newPassword">New password</label>
        <input
          id="newPassword"
          type="password"
          value={form.newPassword}
          onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
          autoComplete="new-password"
          required
        />
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
          {submitting ? "Saving…" : "Change password"}
        </button>
      </form>
    </section>
  );
};

const EmailVerification = () => {
  const { user } = useAuth();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  if (user.isEmailVerified) {
    return (
      <section className="panel">
        <div className="section-head">
          <h2>Email</h2>
          <span className="badge round ok">
            <Icon name="check" size={12} /> Verified
          </span>
        </div>
        <p className="muted">{user.email}</p>
      </section>
    );
  }

  const resend = async () => {
    setError("");
    setSending(true);
    try {
      await authApi.resendVerification();
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="panel">
      <h2>Email</h2>
      <p className="muted">{user.email} — not verified yet.</p>

      <ErrorBanner error={error} onDismiss={() => setError("")} />
      {sent && <p className="notice">Verification email sent.</p>}

      <button
        type="button"
        className="ghost"
        onClick={resend}
        disabled={sending || sent}
      >
        {sending ? "Sending…" : "Resend verification email"}
      </button>
    </section>
  );
};

const Account = () => {
  const { user } = useAuth();

  return (
    <Layout>
      <div className="page-head">
        <div className="who-head">
          <Avatar name={user.fullName || user.username} size="xl" />
          <div>
            <h1>{user.fullName || user.username}</h1>
            <p className="muted">
              @{user.username} · {user.email}
            </p>
          </div>
        </div>
      </div>

      <div className="stack">
        <EmailVerification />
        <ChangePassword />
      </div>
    </Layout>
  );
};

export default Account;
