/**
 * The project's story, reconstructed.
 *
 * There is no audit log in the API: nothing records "Ana moved this to done
 * at 14:02". What every document does carry is `timestamps: true`, so each
 * one knows when it was created and when it was last written. That is enough
 * to rebuild a faithful history, as long as the limits are respected — an
 * event is only claimed here when a timestamp actually proves it.
 *
 * The one inference is a task's `updatedAt`: it marks the last write of any
 * kind, not specifically a status change. For a task now sitting in `done`
 * that write is almost always the one that completed it, which is why the
 * wording stays "marked done" rather than naming an exact edit.
 */
import {
  ROLE_LABEL,
  STATUS_LABEL,
  TASK_PRIORITY,
  TASK_STATUS,
} from "../api/client.js";

/**
 * Creating a project also creates its first membership, and the two writes
 * land a few milliseconds apart. Anything inside this window counts as one
 * action, so the founder does not also appear as a member who "joined", and
 * a freshly created task does not also report an edit.
 */
const SAME_ACTION_MS = 2000;

const toDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const nameOf = (user) => (user ? user.fullName || user.username : null);

/** Ascending by time, with a stable tiebreak so equal stamps never jitter. */
const chronological = (a, b) => a.at - b.at || a.id.localeCompare(b.id);

/**
 * Flattens a project, its members and its tasks into one ordered list of
 * things that happened. Newest first — the present is what gets read.
 */
export const buildTimeline = ({ project, members = [], tasks = [] } = {}) => {
  const events = [];
  const add = (event) => {
    if (event.at) events.push(event);
  };

  const founded = toDate(project?.createdAt);

  // `createdBy` comes back as a bare id, so the name has to be recovered from
  // the member list. A founder who has since been removed stays anonymous.
  const founder = members.find((m) => m.user?._id === project?.createdBy);

  add({
    id: "project-created",
    at: founded,
    kind: "founded",
    tone: "accent",
    icon: "folder",
    title: "Project created",
    detail: project?.name ?? null,
    actor: founder?.user ?? null,
  });

  const edited = toDate(project?.updatedAt);
  if (founded && edited && edited - founded > SAME_ACTION_MS) {
    add({
      id: "project-updated",
      at: edited,
      kind: "edited",
      tone: "neutral",
      icon: "pencil",
      title: "Project details edited",
      detail: project?.description || null,
      actor: null,
    });
  }

  for (const member of members) {
    const joined = toDate(member.createdAt);
    // The founder's own membership is part of creating the project.
    if (founded && joined && joined - founded <= SAME_ACTION_MS) continue;

    add({
      id: `member-${member._id}`,
      at: joined,
      kind: "joined",
      tone: "purple",
      icon: "users",
      title: `${nameOf(member.user) ?? "Someone"} joined the project`,
      detail: ROLE_LABEL[member.role] ?? member.role ?? null,
      actor: member.user ?? null,
    });
  }

  for (const task of tasks) {
    const opened = toDate(task.createdAt);
    add({
      id: `task-${task._id}-created`,
      at: opened,
      kind: "task-created",
      tone: "neutral",
      icon: "plus",
      title: task.title,
      detail: "Task created",
      actor: task.assignedBy ?? null,
      badge:
        task.priority && task.priority !== TASK_PRIORITY.MEDIUM
          ? task.priority
          : null,
    });

    const touched = toDate(task.updatedAt);
    if (!opened || !touched || touched - opened <= SAME_ACTION_MS) continue;

    // A task that was written after it was created gets a second event, named
    // by where it ended up rather than by what the edit actually was.
    const landed = {
      [TASK_STATUS.DONE]: {
        kind: "task-done",
        tone: "ok",
        icon: "check",
        detail: "Marked done",
      },
      [TASK_STATUS.IN_PROGRESS]: {
        kind: "task-progress",
        tone: "warn",
        icon: "clock",
        detail: "Picked up",
      },
      [TASK_STATUS.TODO]: {
        kind: "task-edited",
        tone: "neutral",
        icon: "pencil",
        detail: "Updated",
      },
    }[task.status] ?? {
      kind: "task-edited",
      tone: "neutral",
      icon: "pencil",
      detail: "Updated",
    };

    add({
      id: `task-${task._id}-${landed.kind}`,
      at: touched,
      kind: landed.kind,
      tone: landed.tone,
      icon: landed.icon,
      title: task.title,
      detail: landed.detail,
      actor: task.assignedTo ?? null,
    });
  }

  return events.sort(chronological).reverse();
};

/**
 * Where the project stands right now, which is the one part of the timeline
 * that is not history: counts straight off the task list, plus the share of
 * work finished so the header can show it as a meter.
 */
export const summarize = (
  { members = [], tasks = [] } = {},
  now = new Date(),
) => {
  const counts = {
    [TASK_STATUS.TODO]: 0,
    [TASK_STATUS.IN_PROGRESS]: 0,
    [TASK_STATUS.DONE]: 0,
  };

  let overdue = 0;

  for (const task of tasks) {
    if (task.status in counts) counts[task.status] += 1;

    const due = toDate(task.dueDate);
    if (due && due < now && task.status !== TASK_STATUS.DONE) overdue += 1;
  }

  const total = tasks.length;
  const done = counts[TASK_STATUS.DONE];

  return {
    total,
    done,
    overdue,
    members: members.length,
    counts,
    // Rounded for display, but never to 100% while work is still open.
    percent:
      total === 0
        ? 0
        : done === total
          ? 100
          : Math.min(99, Math.round((done / total) * 100)),
    labels: STATUS_LABEL,
  };
};

/** "Today" / "Yesterday" / "12 Mar 2026", used for the day dividers. */
export const dayLabel = (date, now = new Date()) => {
  const day = new Date(date);
  const midnight = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const days = Math.round((midnight(now) - midnight(day)) / 86_400_000);

  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";

  return day.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    ...(day.getFullYear() === now.getFullYear() ? {} : { year: "numeric" }),
  });
};

/** Groups an already-sorted list into [{ key, label, events }] by calendar day. */
export const groupByDay = (events, now = new Date()) => {
  const groups = [];

  for (const event of events) {
    const key = new Date(event.at).toDateString();
    const last = groups.at(-1);

    if (last?.key === key) last.events.push(event);
    else groups.push({ key, label: dayLabel(event.at, now), events: [event] });
  }

  return groups;
};
