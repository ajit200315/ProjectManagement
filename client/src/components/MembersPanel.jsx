import { useState } from "react";
import { memberApi, ROLE_LABEL, ROLES } from "../api/client.js";
import ErrorBanner from "./ErrorBanner.jsx";
import Avatar from "./Avatar.jsx";
import Icon from "./Icon.jsx";

const MembersPanel = ({
  projectId,
  members,
  canManage,
  currentUserId,
  onChanged,
}) => {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState(ROLES.MEMBER);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const run = async (action) => {
    setBusy(true);
    setError("");
    try {
      await action();
      await onChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const add = (event) => {
    event.preventDefault();
    return run(async () => {
      await memberApi.add(projectId, { email: email.trim(), role });
      setEmail("");
      setRole(ROLES.MEMBER);
    });
  };

  return (
    <section className="panel">
      <div className="section-head">
        <h2>
          <Icon name="users" size={15} /> Members
        </h2>
        <span className="count">{members.length}</span>
      </div>

      <ErrorBanner error={error} onDismiss={() => setError("")} />

      <ul className="list">
        {members.map((member) => (
          <li key={member.user._id}>
            <div className="member">
              <Avatar name={member.user.fullName || member.user.username} />
              <div className="member-name">
                <strong>
                  {member.user.username}
                  {member.user._id === currentUserId && (
                    <span className="muted small"> (you)</span>
                  )}
                </strong>
                {member.user.fullName && (
                  <p className="muted small">{member.user.fullName}</p>
                )}
              </div>
            </div>

            <div className="member-actions">
              {canManage ? (
                <select
                  aria-label={`Role for ${member.user.username}`}
                  value={member.role}
                  onChange={(event) =>
                    run(() =>
                      memberApi.updateRole(
                        projectId,
                        member.user._id,
                        event.target.value,
                      ),
                    )
                  }
                  disabled={busy}
                >
                  {Object.values(ROLES).map((value) => (
                    <option key={value} value={value}>
                      {ROLE_LABEL[value]}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="badge round">{ROLE_LABEL[member.role]}</span>
              )}

              {canManage && (
                <button
                  type="button"
                  className="icon danger"
                  disabled={busy}
                  onClick={() =>
                    run(() => memberApi.remove(projectId, member.user._id))
                  }
                  title={`Remove ${member.user.username}`}
                  aria-label={`Remove ${member.user.username}`}
                >
                  <Icon name="x" size={14} />
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      {canManage && (
        <form className="inline-form panel-form" onSubmit={add}>
          <input
            type="email"
            aria-label="Member email"
            placeholder="Add someone by email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <select
            aria-label="Role for the new member"
            value={role}
            onChange={(event) => setRole(event.target.value)}
          >
            {Object.values(ROLES).map((value) => (
              <option key={value} value={value}>
                {ROLE_LABEL[value]}
              </option>
            ))}
          </select>
          <button type="submit" className="ghost small" disabled={busy}>
            <Icon name="plus" size={14} /> Add
          </button>
        </form>
      )}
    </section>
  );
};

export default MembersPanel;
