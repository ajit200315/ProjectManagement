import { useEffect, useState } from "react";
import { useAuth } from "../context/auth-context.js";
import { projectApi } from "../api/client.js";

/**
 * Deliberately thin: its job is to prove an authenticated request works
 * end to end. The projects UI proper comes next.
 */
const Dashboard = () => {
  const { user, logout } = useAuth();
  const [projects, setProjects] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    projectApi
      .list()
      .then((data) => active && setProjects(data))
      .catch((err) => active && setError(err.message))
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="card wide">
      <header className="row">
        <div>
          <h1>Your projects</h1>
          <p className="muted">
            Signed in as <strong>{user.username}</strong>
            {user.isEmailVerified ? null : " · email not verified"}
          </p>
        </div>
        <button type="button" className="ghost" onClick={logout}>
          Sign out
        </button>
      </header>

      {loading && <p className="muted">Loading projects…</p>}
      {error && <p className="alert">{error}</p>}

      {!loading && !error && projects.length === 0 && (
        <p className="muted">
          No projects yet. The API is reachable and your token works — this is
          where the projects UI goes next.
        </p>
      )}

      {projects.length > 0 && (
        <ul className="list">
          {projects.map(({ project, role }) => (
            <li key={project._id}>
              <div>
                <strong>{project.name}</strong>
                {project.description && (
                  <p className="muted">{project.description}</p>
                )}
              </div>
              <span className="badge">
                {role} · {project.members} member
                {project.members === 1 ? "" : "s"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Dashboard;
