import { useState } from "react";
import {
  PRIORITY_LABEL,
  STATUS_LABEL,
  TASK_PRIORITY,
  TASK_STATUS,
  taskApi,
} from "../api/client.js";
import ErrorBanner from "./ErrorBanner.jsx";
import ConfirmButton from "./ConfirmButton.jsx";
import Attachments from "./Attachments.jsx";
import Avatar from "./Avatar.jsx";
import Icon from "./Icon.jsx";
import Priority from "./Priority.jsx";

/** Flags a date that has passed, unless the task is already done. */
const DueDate = ({ value, status }) => {
  // Captured once per mount rather than read on every render: the clock is
  // not a pure input, and re-deriving it would make the badge flip state
  // during an unrelated re-render at exactly the wrong moment.
  const [now] = useState(() => Date.now());

  const date = new Date(value);
  const overdue = date.getTime() < now && status !== TASK_STATUS.DONE;

  return (
    <span>
      <Icon name={overdue ? "clock" : "calendar"} size={12} />
      {overdue ? "Overdue · " : ""}
      {date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
    </span>
  );
};

const TaskCard = ({ projectId, task, members = [], canManage, onChanged }) => {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    title: "",
    description: "",
    assignedTo: "",
    priority: TASK_PRIORITY.MEDIUM,
    dueDate: "",
  });
  const [subtasks, setSubtasks] = useState(null);
  const [attachments, setAttachments] = useState([]);
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
        setAttachments(detail.attachments ?? []);
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

  const startEditing = () => {
    setDraft({
      title: task.title,
      description: task.description ?? "",
      assignedTo: task.assignedTo?._id ?? "",
      priority: task.priority ?? TASK_PRIORITY.MEDIUM,
      // <input type="date"> wants YYYY-MM-DD, not an ISO timestamp.
      dueDate: task.dueDate ? task.dueDate.slice(0, 10) : "",
    });
    setEditing(true);
    setExpanded(true);
  };

  const saveEdit = (event) => {
    event.preventDefault();
    return run(async () => {
      await taskApi.update(projectId, task._id, {
        title: draft.title,
        description: draft.description,
        // "" would fail the mongo-id check; null clears the assignee.
        assignedTo: draft.assignedTo || null,
        priority: draft.priority,
        dueDate: draft.dueDate,
      });
      setEditing(false);
      await onChanged();
    });
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
  const total = subtasks?.length ?? 0;

  return (
    <article>
      <div>
        <button type="button" onClick={toggleExpanded} aria-expanded={expanded}>
          <Icon name="chevronRight" size={14} />
          {task.title}
        </button>

        {canManage && !editing && (
          <span>
            <button
              type="button"
              onClick={startEditing}
              disabled={busy}
              title="Edit task"
              aria-label={`Edit ${task.title}`}
            >
              <Icon name="pencil" />
            </button>
            <ConfirmButton
              onConfirm={remove}
              disabled={busy}
              confirmLabel="Sure?"
              aria-label={`Delete ${task.title}`}
            >
              <Icon name="trash" />
            </ConfirmButton>
          </span>
        )}
      </div>

      {task.description && !editing && <p>{task.description}</p>}

      <div>
        <Priority value={task.priority} />
        {task.dueDate && <DueDate value={task.dueDate} status={task.status} />}
        {total > 0 && (
          <span>
            <Icon name="check" size={12} />
            {done}/{total}
          </span>
        )}
        <span>
          <Avatar
            name={task.assignedTo?.username}
            title={
              task.assignedTo
                ? `Assigned to ${task.assignedTo.username}`
                : "Unassigned"
            }
          />
        </span>
      </div>

      <ErrorBanner error={error} onDismiss={() => setError("")} />

      {expanded && editing && (
        <form onSubmit={saveEdit}>
          <input
            aria-label="Task title"
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            required
          />
          <input
            aria-label="Task description"
            placeholder="Description (optional)"
            value={draft.description}
            onChange={(e) =>
              setDraft({ ...draft, description: e.target.value })
            }
          />
          <select
            aria-label="Assign to"
            value={draft.assignedTo}
            onChange={(e) => setDraft({ ...draft, assignedTo: e.target.value })}
          >
            <option value="">Unassigned</option>
            {members.map((member) => (
              <option key={member.user._id} value={member.user._id}>
                {member.user.username}
              </option>
            ))}
          </select>
          <select
            aria-label="Priority"
            value={draft.priority}
            onChange={(e) => setDraft({ ...draft, priority: e.target.value })}
          >
            {Object.values(TASK_PRIORITY).map((value) => (
              <option key={value} value={value}>
                {PRIORITY_LABEL[value]}
              </option>
            ))}
          </select>
          <input
            type="date"
            aria-label="Due date"
            value={draft.dueDate}
            onChange={(e) => setDraft({ ...draft, dueDate: e.target.value })}
          />
          <div>
            <button type="submit" disabled={busy}>
              Save
            </button>
            <button type="button" onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {expanded && !editing && (
        <div>
          {canManage && (
            <label>
              <span>Status</span>
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

          <p>
            <Icon name="check" size={12} />
            Subtasks
          </p>

          {subtasks === null && <p>Loading subtasks…</p>}

          {total > 0 && (
            <>
              <div
                role="progressbar"
                aria-valuenow={done}
                aria-valuemin={0}
                aria-valuemax={total}
                aria-label="Subtasks completed"
              />

              <ul>
                {subtasks.map((subtask) => (
                  <li key={subtask._id}>
                    <label>
                      <input
                        type="checkbox"
                        checked={subtask.isCompleted}
                        onChange={() => toggleSubTask(subtask)}
                        disabled={busy}
                      />
                      <span>{subtask.title}</span>
                    </label>
                    {canManage && (
                      <ConfirmButton
                        onConfirm={() => removeSubTask(subtask)}
                        disabled={busy}
                        confirmLabel="Sure?"
                        aria-label={`Delete subtask ${subtask.title}`}
                      >
                        <Icon name="x" size={14} />
                      </ConfirmButton>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}

          {subtasks !== null && total === 0 && <p>No subtasks.</p>}

          {canManage && (
            <form onSubmit={addSubTask}>
              <input
                aria-label="New subtask"
                placeholder="Add a subtask"
                value={newSubTask}
                onChange={(event) => setNewSubTask(event.target.value)}
              />
              <button type="submit" disabled={busy}>
                Add
              </button>
            </form>
          )}

          <Attachments
            projectId={projectId}
            taskId={task._id}
            attachments={attachments}
            canDelete={canManage}
            onChanged={async () => {
              const detail = await taskApi.get(projectId, task._id);
              setAttachments(detail.attachments ?? []);
            }}
          />
        </div>
      )}
    </article>
  );
};

export default TaskCard;
