import { useCallback, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { can, memberApi, projectApi, taskApi } from "../api/client.js";
import { useAuth } from "../context/auth-context.js";
import Layout from "../components/Layout.jsx";
import Spinner from "../components/Spinner.jsx";
import ErrorBanner from "../components/ErrorBanner.jsx";
import TaskBoard from "../components/TaskBoard.jsx";
import MembersPanel from "../components/MembersPanel.jsx";
import NotesPanel from "../components/NotesPanel.jsx";
import Pager from "../components/Pager.jsx";
import ConfirmButton from "../components/ConfirmButton.jsx";
import { useResource } from "../hooks/useResource.js";

const ProjectDetail = () => {
  const { projectId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [actionError, setActionError] = useState("");
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    priority: "",
    assignedTo: "",
    overdue: "",
    sort: "createdAt",
  });
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ name: "", description: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [project, members, tasks] = await Promise.all([
      projectApi.get(projectId),
      memberApi.list(projectId),
      // The board shows all three columns at once, so it asks for a large
      // page and offers a pager only when a project outgrows it.
      taskApi.list(projectId, { ...filters, page, limit: 50 }),
    ]);
    return { project, members, tasks };
  }, [projectId, page, filters]);

  const { data, loading, error: fatal, refresh } = useResource(load);
  const { project, members = [], tasks } = data ?? {};
  const taskItems = tasks?.items ?? [];

  const updateFilter = (patch) => {
    setPage(1);
    setFilters((current) => ({ ...current, ...patch }));
  };

  // The role comes from the member list rather than being passed in, so a
  // direct link or a refresh still knows what this user is allowed to do.
  const role = members.find((member) => member.user._id === user._id)?.role;

  const deleteProject = async () => {
    try {
      await projectApi.remove(projectId);
      navigate("/", { replace: true });
    } catch (err) {
      setActionError(err.message);
    }
  };

  const startEditing = () => {
    setDraft({ name: project.name, description: project.description ?? "" });
    setEditing(true);
  };

  const saveProject = async (event) => {
    event.preventDefault();
    setActionError("");
    setSaving(true);
    try {
      await projectApi.update(projectId, draft);
      await refresh();
      setEditing(false);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <Spinner label="Loading project…" />
      </Layout>
    );
  }

  if (fatal) {
    return (
      <Layout>
        <ErrorBanner error={fatal} />
        <Link to="/" className="link">
          ← Back to projects
        </Link>
      </Layout>
    );
  }

  return (
    <Layout>
      <Link to="/" className="link back">
        ← Projects
      </Link>

      <div className="page-head">
        {editing ? (
          <form className="inline-form" onSubmit={saveProject}>
            <input
              aria-label="Project name"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              autoFocus
              required
            />
            <input
              aria-label="Project description"
              placeholder="Description (optional)"
              value={draft.description}
              onChange={(e) =>
                setDraft({ ...draft, description: e.target.value })
              }
            />
            <div className="actions">
              <button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                className="ghost"
                onClick={() => setEditing(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <>
            <div>
              <h1>{project.name}</h1>
              {project.description && (
                <p className="muted">{project.description}</p>
              )}
            </div>
            {can.manageProject(role) && (
              <div className="actions">
                <button type="button" className="ghost" onClick={startEditing}>
                  Edit
                </button>
                <ConfirmButton
                  onConfirm={deleteProject}
                  confirmLabel="Really delete?"
                >
                  Delete project
                </ConfirmButton>
              </div>
            )}
          </>
        )}
      </div>

      <ErrorBanner error={actionError} onDismiss={() => setActionError("")} />

      <div className="split">
        <div>
          <TaskBoard
            projectId={projectId}
            tasks={taskItems}
            members={members}
            canManage={can.manageTasks(role)}
            onChanged={refresh}
            filters={filters}
            onFilterChange={updateFilter}
          />
          <Pager
            pagination={tasks?.pagination}
            onPage={setPage}
            busy={loading}
          />
        </div>

        <div className="stack">
          <MembersPanel
            projectId={projectId}
            members={members}
            canManage={can.manageMembers(role)}
            currentUserId={user._id}
            onChanged={refresh}
          />
          <NotesPanel projectId={projectId} canManage={can.manageNotes(role)} />
        </div>
      </div>
    </Layout>
  );
};

export default ProjectDetail;
