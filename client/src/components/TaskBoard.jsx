import { useState } from "react";
import {
  PRIORITY_LABEL,
  STATUS_LABEL,
  TASK_PRIORITY,
  TASK_STATUS,
  taskApi,
} from "../api/client.js";
import TaskCard from "./TaskCard.jsx";
import ErrorBanner from "./ErrorBanner.jsx";
import Icon from "./Icon.jsx";

const BLANK = {
  title: "",
  description: "",
  assignedTo: "",
  priority: TASK_PRIORITY.MEDIUM,
  dueDate: "",
};

const NewTaskForm = ({ projectId, members, onCreated }) => {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const close = () => {
    setOpen(false);
    setForm(BLANK);
    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      await taskApi.create(projectId, {
        title: form.title,
        description: form.description || undefined,
        // The API validates assignedTo as a mongo id, so omit it entirely
        // rather than sending an empty string.
        assignedTo: form.assignedTo || undefined,
        priority: form.priority,
        dueDate: form.dueDate || undefined,
      });
      await onCreated();
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
        <Icon name="plus" /> New task
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <ErrorBanner error={error} />
      <input
        aria-label="Task title"
        placeholder="Task title"
        value={form.title}
        onChange={(e) => setForm({ ...form, title: e.target.value })}
        autoFocus
        required
      />
      <input
        aria-label="Task description"
        placeholder="Description (optional)"
        value={form.description}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
      />
      <select
        aria-label="Assign to"
        value={form.assignedTo}
        onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}
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
        value={form.priority}
        onChange={(e) => setForm({ ...form, priority: e.target.value })}
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
        value={form.dueDate}
        onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
      />
      <div>
        <button type="submit" disabled={saving}>
          {saving ? "Creating…" : "Create task"}
        </button>
        <button type="button" onClick={close}>
          Cancel
        </button>
      </div>
    </form>
  );
};

const TaskBoard = ({
  projectId,
  tasks,
  members,
  canManage,
  onChanged,
  filters,
  onFilterChange,
}) => {
  const columns = Object.values(TASK_STATUS);

  return (
    <section>
      <div>
        <h2>
          <Icon name="board" size={15} /> Board
        </h2>
        {canManage && (
          <NewTaskForm
            projectId={projectId}
            members={members}
            onCreated={onChanged}
          />
        )}
      </div>

      {filters && (
        <div>
          <span>
            <Icon name="filter" size={13} /> Filter
          </span>

          <select
            aria-label="Filter by priority"
            value={filters.priority}
            onChange={(e) => onFilterChange({ priority: e.target.value })}
          >
            <option value="">Any priority</option>
            {Object.values(TASK_PRIORITY).map((value) => (
              <option key={value} value={value}>
                {PRIORITY_LABEL[value]}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by assignee"
            value={filters.assignedTo}
            onChange={(e) => onFilterChange({ assignedTo: e.target.value })}
          >
            <option value="">Anyone</option>
            {members.map((member) => (
              <option key={member.user._id} value={member.user._id}>
                {member.user.username}
              </option>
            ))}
          </select>

          <label>
            <input
              type="checkbox"
              checked={filters.overdue === "true"}
              onChange={(e) =>
                onFilterChange({ overdue: e.target.checked ? "true" : "" })
              }
            />
            Overdue only
          </label>

          <select
            aria-label="Sort by"
            value={filters.sort}
            onChange={(e) => onFilterChange({ sort: e.target.value })}
          >
            <option value="createdAt">Newest first</option>
            <option value="dueDate">Due date</option>
            <option value="priority">Priority</option>
            <option value="title">Title</option>
          </select>
        </div>
      )}

      <div>
        {columns.map((status) => {
          const inColumn = tasks.filter((task) => task.status === status);
          return (
            <div key={status}>
              <div>
                <h3>{STATUS_LABEL[status]}</h3>
                <span>{inColumn.length}</span>
              </div>

              {inColumn.length === 0 && <p>Nothing here yet</p>}

              {inColumn.map((task) => (
                <TaskCard
                  key={task._id}
                  projectId={projectId}
                  task={task}
                  members={members}
                  canManage={canManage}
                  onChanged={onChanged}
                />
              ))}
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default TaskBoard;
