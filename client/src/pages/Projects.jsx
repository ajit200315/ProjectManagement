import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { projectApi, ROLE_LABEL } from "../api/client.js";
import { useResource } from "../hooks/useResource.js";
import Pager from "../components/Pager.jsx";
import Layout from "../components/Layout.jsx";
import Spinner from "../components/Spinner.jsx";
import ErrorBanner from "../components/ErrorBanner.jsx";
import Icon from "../components/Icon.jsx";

const NewProjectForm = ({ onCreated }) => {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const close = () => {
    setOpen(false);
    setForm({ name: "", description: "" });
    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      await onCreated(form);
      close();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)}>
        <Icon name="plus" /> New project
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <ErrorBanner error={error} />
      <input
        aria-label="Project name"
        placeholder="Project name"
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        autoFocus
        required
      />
      <input
        aria-label="Description"
        placeholder="Description (optional)"
        value={form.description}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
      />
      <div>
        <button type="submit" disabled={saving}>
          {saving ? "Creating…" : "Create"}
        </button>
        <button type="button" onClick={close}>
          Cancel
        </button>
      </div>
    </form>
  );
};

const Projects = () => {
  const [page, setPage] = useState(1);
  const load = useCallback(() => projectApi.list({ page }), [page]);
  const { data, loading, error, refresh, setError } = useResource(load);
  const projects = data?.items ?? [];

  const create = async (payload) => {
    await projectApi.create(payload);
    // A new project sorts to the top, so show it rather than leaving the
    // user on a page where it is not.
    if (page !== 1) setPage(1);
    else await refresh();
  };

  return (
    <Layout>
      <div>
        <div>
          <h1>Projects</h1>
          <p>Everything you own or have been added to.</p>
        </div>
        <NewProjectForm onCreated={create} />
      </div>

      <ErrorBanner error={error} onDismiss={() => setError("")} />

      {loading && <Spinner label="Loading projects…" />}

      {!loading && projects.length === 0 && !error && (
        <div>
          <span>
            <Icon name="folder" size={20} />
          </span>
          <p>
            <strong>No projects yet</strong>
          </p>
          <p>Create one to start adding tasks and teammates.</p>
        </div>
      )}

      <div>
        {projects.map(({ project, role }) => (
          <Link key={project._id} to={`/projects/${project._id}`}>
            <div>
              <span aria-hidden="true">
                {project.name.trim().charAt(0).toUpperCase()}
              </span>
              <span>
                <span>{project.name}</span>
                {project.description && <p>{project.description}</p>}
              </span>
            </div>

            <div>
              <span>
                <Icon name="users" size={13} /> {project.members} member
                {project.members === 1 ? "" : "s"}
              </span>
              <span>{ROLE_LABEL[role] ?? role}</span>
            </div>
          </Link>
        ))}
      </div>

      <Pager pagination={data?.pagination} onPage={setPage} busy={loading} />
    </Layout>
  );
};

export default Projects;
