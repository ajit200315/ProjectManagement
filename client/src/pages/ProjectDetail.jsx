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
import Avatar from "../components/Avatar.jsx";
import Timeline from "../components/Timeline.jsx";
import Icon from "../components/Icon.jsx";
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

  // The timeline keeps its own unfiltered copy of the tasks, so it has no way
  // to know a mutation landed. Bumping this on every refresh is that signal.
  const [revision, setRevision] = useState(0);
  const reload = useCallback(async () => {
    await refresh();
    setRevision((n) => n + 1);
  }, [refresh]);

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
      await reload();
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
        <Link to="/">← Back to projects</Link>
      </Layout>
    );
  }

  return (
    <Layout>
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to="/">Projects</Link>
        <Icon name="chevronRight" size={12} />
        <span>{project.name}</span>
      </nav>

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
            <div className="project-id">
              <div>
                <h1>{project.name}</h1>
                {project.description && (
                  <p className="muted">{project.description}</p>
                )}
                {/* Who is on this project, as a glance rather than a trip to
                    the members panel. */}
                <div className="avatar-group" aria-hidden="true">
                  {members.slice(0, 5).map((member) => (
                    <Avatar
                      key={member.user._id}
                      name={member.user.fullName || member.user.username}
                      size="sm"
                    />
                  ))}
                  {members.length > 5 && (
                    <span className="avatar sm more">
                      +{members.length - 5}
                    </span>
                  )}
                </div>
              </div>
            </div>
            {can.manageProject(role) && (
              <div className="actions">
                <button
                  type="button"
                  className="outline"
                  onClick={startEditing}
                >
                  <Icon name="pencil" size={14} /> Edit
                </button>
                <ConfirmButton
                  className="ghost danger"
                  onConfirm={deleteProject}
                  confirmLabel="Really delete?"
                >
                  <Icon name="trash" size={14} /> Delete project
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
            onChanged={reload}
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
            onChanged={reload}
          />
          <NotesPanel projectId={projectId} canManage={can.manageNotes(role)} />
        </div>
      </div>

      <Timeline
        projectId={projectId}
        project={project}
        members={members}
        revision={revision}
      />
    </Layout>
  );
};

export default ProjectDetail;
