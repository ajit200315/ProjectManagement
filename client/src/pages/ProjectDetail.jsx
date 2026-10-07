import { useCallback, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { can, memberApi, projectApi, taskApi } from "../api/client.js";
import { useAuth } from "../context/auth-context.js";
import Layout from "../components/Layout.jsx";
import Spinner from "../components/Spinner.jsx";
import ErrorBanner from "../components/ErrorBanner.jsx";
import TaskBoard from "../components/TaskBoard.jsx";
import MembersPanel from "../components/MembersPanel.jsx";
import { useResource } from "../hooks/useResource.js";

const ProjectDetail = () => {
  const { projectId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [actionError, setActionError] = useState("");

  const load = useCallback(async () => {
    const [project, members, tasks] = await Promise.all([
      projectApi.get(projectId),
      memberApi.list(projectId),
      taskApi.list(projectId),
    ]);
    return { project, members, tasks };
  }, [projectId]);

  const { data, loading, error: fatal, refresh } = useResource(load);
  const { project, members = [], tasks = [] } = data ?? {};

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
        <div>
          <h1>{project.name}</h1>
          {project.description && (
            <p className="muted">{project.description}</p>
          )}
        </div>
        {can.manageProject(role) && (
          <button
            type="button"
            className="ghost danger"
            onClick={deleteProject}
          >
            Delete project
          </button>
        )}
      </div>

      <ErrorBanner error={actionError} onDismiss={() => setActionError("")} />

      <div className="split">
        <TaskBoard
          projectId={projectId}
          tasks={tasks}
          members={members}
          canManage={can.manageTasks(role)}
          onChanged={refresh}
        />

        <MembersPanel
          projectId={projectId}
          members={members}
          canManage={can.manageMembers(role)}
          currentUserId={user._id}
          onChanged={refresh}
        />
      </div>
    </Layout>
  );
};

export default ProjectDetail;
