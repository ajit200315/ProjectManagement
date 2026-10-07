import { useState } from "react";
import { STATUS_LABEL, TASK_STATUS, taskApi } from "../api/client.js";
import ErrorBanner from "./ErrorBanner.jsx";

const TaskCard = ({ projectId, task, canManage, onChanged }) => {
  const [expanded, setExpanded] = useState(false);
  const [subtasks, setSubtasks] = useState(null);
  const [newSubTask, setNewSubTask] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // The list endpoint omits subtasks, so fetch them the first time the
  // card is opened rather than making the board load N+1 requests.
  const toggleExpanded = async () => {
    const next = !expanded;
    setExpanded(next);
    if (next && subtasks === null) {
      try {
        const detail = await taskApi.get(projectId, task._id);
        setSubtasks(detail.subtasks ?? []);
      } catch (err) {
        setError(err.message);
        setSubtasks([]);
      }
    }
  };

  const run = async (action) => {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const changeStatus = (status) =>
    run(async () => {
      await taskApi.update(projectId, task._id, { status });
      await onChanged();
    });

  const remove = () =>
    run(async () => {
      await taskApi.remove(projectId, task._id);
      await onChanged();
    });

  const addSubTask = (event) => {
    event.preventDefault();
    const title = newSubTask.trim();
    if (!title) return;

    return run(async () => {
      const created = await taskApi.addSubTask(projectId, task._id, title);
      setSubtasks([...(subtasks ?? []), created]);
      setNewSubTask("");
    });
  };

  const toggleSubTask = (subtask) =>
    run(async () => {
      const updated = await taskApi.updateSubTask(
        projectId,
        task._id,
        subtask._id,
        { isCompleted: !subtask.isCompleted },
      );
      setSubtasks(
        subtasks.map((item) => (item._id === updated._id ? updated : item)),
      );
    });

  const removeSubTask = (subtask) =>
    run(async () => {
      await taskApi.removeSubTask(projectId, task._id, subtask._id);
      setSubtasks(subtasks.filter((item) => item._id !== subtask._id));
    });

  const done = subtasks?.filter((item) => item.isCompleted).length ?? 0;

  return (
    <article className={`task ${busy ? "busy" : ""}`}>
      <div className="task-head">
        <button
          type="button"
          className="link task-title"
          onClick={toggleExpanded}
          aria-expanded={expanded}
        >
          {expanded ? "▾" : "▸"} {task.title}
        </button>
        {canManage && (
          <button
            type="button"
            className="link danger"
            onClick={remove}
            disabled={busy}
            aria-label={`Delete ${task.title}`}
          >
            ✕
          </button>
        )}
      </div>

      {task.description && <p className="muted small">{task.description}</p>}

      <div className="task-meta">
        {task.assignedTo ? (
          <span className="badge">@{task.assignedTo.username}</span>
        ) : (
          <span className="badge dim">Unassigned</span>
        )}
        {subtasks?.length > 0 && (
          <span className="badge dim">
            {done}/{subtasks.length} done
          </span>
        )}
      </div>

      <ErrorBanner error={error} onDismiss={() => setError("")} />

      {expanded && (
        <div className="task-body">
          {canManage && (
            <label className="status-row">
              <span className="muted small">Status</span>
              <select
                value={task.status}
                onChange={(event) => changeStatus(event.target.value)}
                disabled={busy}
              >
                {Object.values(TASK_STATUS).map((status) => (
                  <option key={status} value={status}>
                    {STATUS_LABEL[status]}
                  </option>
                ))}
              </select>
            </label>
          )}

          {subtasks === null && (
            <p className="muted small">Loading subtasks…</p>
          )}

          {subtasks?.length > 0 && (
            <ul className="subtasks">
              {subtasks.map((subtask) => (
                <li key={subtask._id}>
                  <label>
                    <input
                      type="checkbox"
                      checked={subtask.isCompleted}
                      onChange={() => toggleSubTask(subtask)}
                      disabled={busy}
                    />
                    <span className={subtask.isCompleted ? "struck" : ""}>
                      {subtask.title}
                    </span>
                  </label>
                  {canManage && (
                    <button
                      type="button"
                      className="link danger"
                      onClick={() => removeSubTask(subtask)}
                      disabled={busy}
                      aria-label={`Delete ${subtask.title}`}
                    >
                      ✕
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}

          {subtasks !== null && subtasks.length === 0 && (
            <p className="muted small">No subtasks.</p>
          )}

          {canManage && (
            <form className="subtask-add" onSubmit={addSubTask}>
              <input
                aria-label="New subtask"
                placeholder="Add a subtask"
                value={newSubTask}
                onChange={(event) => setNewSubTask(event.target.value)}
              />
              <button type="submit" className="ghost small" disabled={busy}>
                Add
              </button>
            </form>
          )}
        </div>
      )}
    </article>
  );
};

export default TaskCard;
