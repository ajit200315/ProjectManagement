import { Fragment, useCallback, useMemo, useState } from "react";
import { taskApi } from "../api/client.js";
import { useResource } from "../hooks/useResource.js";
import {
  buildTimeline,
  groupByDay,
  summarize,
} from "../lib/projectTimeline.js";
import Avatar from "./Avatar.jsx";
import ErrorBanner from "./ErrorBanner.jsx";
import Icon from "./Icon.jsx";

/** Enough to fill the panel without turning the page into a wall of history. */
const PAGE = 14;

/** The stagger is capped so a long list does not crawl in for four seconds. */
const MAX_STEPS = 12;

const relative = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

const UNITS = [
  ["year", 31_536_000_000],
  ["month", 2_592_000_000],
  ["week", 604_800_000],
  ["day", 86_400_000],
  ["hour", 3_600_000],
  ["minute", 60_000],
];

const timeAgo = (date, now = Date.now()) => {
  const elapsed = now - date.getTime();

  for (const [unit, ms] of UNITS) {
    if (elapsed >= ms) return relative.format(-Math.floor(elapsed / ms), unit);
  }
  return "just now";
};

const exact = (date) =>
  date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

/**
 * The project's history as a branching thread, with the present pinned at the
 * top and everything that led to it running back in time below.
 *
 * It reads its own copy of the task list rather than borrowing the board's:
 * the board's is filtered, sorted and paged by whatever the user is doing to
 * it, and history that rearranges itself when someone ticks "overdue only"
 * is not history. `revision` is the parent's way of saying a mutation landed,
 * which is what pulls a fresh copy.
 */
const Timeline = ({ projectId, project, members = [], revision = 0 }) => {
  const load = useCallback(
    // A high limit rather than paging: the panel wants the whole arc, and it
    // shows the cut-off honestly when a project is bigger than this.
    () => taskApi.list(projectId, { limit: 100, sort: "createdAt" }),
    // `revision` is deliberately a dependency it does not read: the parent
    // bumps it after a mutation, and that is what makes this refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [projectId, revision],
  );

  const { data, loading, error, setError } = useResource(load);

  // Memoised because `?? []` would otherwise hand the derivation a new array
  // on every render and defeat it.
  const tasks = useMemo(() => data?.items ?? [], [data]);
  const truncated = (data?.pagination?.total ?? 0) > tasks.length;

  const [shown, setShown] = useState(PAGE);

  const { events, stats } = useMemo(
    () => ({
      events: buildTimeline({ project, members, tasks }),
      stats: summarize({ members, tasks }),
    }),
    [project, members, tasks],
  );

  const visible = events.slice(0, shown);
  const groups = useMemo(() => groupByDay(visible), [visible]);

  // One running index across day groups, so the stagger does not restart at
  // every divider.
  let step = 0;
  const next = () => Math.min(step++, MAX_STEPS);

  return (
    <section className="panel timeline-panel">
      <div className="section-head">
        <h2>
          <Icon name="activity" size={15} /> Timeline
        </h2>
        {events.length > 0 && (
          <span className="muted small">
            {events.length} event{events.length === 1 ? "" : "s"}
            {truncated && " (most recent tasks)"}
          </span>
        )}
      </div>

      <ErrorBanner error={error} onDismiss={() => setError("")} />

      {loading ? (
        <p className="muted small">Reading the project's history…</p>
      ) : (
        <ol className="timeline">
          {/* The present: the one node that is a state rather than an event. */}
          <li className="tl-item tl-now" style={{ "--i": next() }}>
            <span className="tl-node" aria-hidden="true">
              <Icon name="branch" size={12} />
            </span>

            <div className="tl-card">
              <div className="tl-now-head">
                <span className="tl-pulse-label">Right now</span>
                <span className="muted small">
                  {stats.members} member{stats.members === 1 ? "" : "s"}
                </span>
              </div>

              <div
                className="tl-meter"
                role="progressbar"
                aria-valuenow={stats.percent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Share of tasks done"
              >
                <span style={{ "--pct": `${stats.percent}%` }} />
              </div>

              <p className="tl-figures">
                <strong>{stats.percent}%</strong>
                <span className="muted">
                  {stats.done} of {stats.total} task
                  {stats.total === 1 ? "" : "s"} done
                </span>
              </p>

              <div className="tl-chips">
                <span className="badge dim">
                  {stats.counts.todo} {stats.labels.todo}
                </span>
                <span className="badge warn">
                  {stats.counts.in_progress} {stats.labels.in_progress}
                </span>
                <span className="badge ok">
                  {stats.counts.done} {stats.labels.done}
                </span>
                {stats.overdue > 0 && (
                  <span className="badge overdue">{stats.overdue} overdue</span>
                )}
              </div>
            </div>
          </li>

          {groups.map((group) => (
            <Fragment key={group.key}>
              <li className="tl-day" aria-hidden="true">
                <span>{group.label}</span>
              </li>

              {group.events.map((event) => (
                <li
                  key={event.id}
                  className="tl-item"
                  data-tone={event.tone}
                  style={{ "--i": next() }}
                >
                  <span className="tl-node" aria-hidden="true">
                    <Icon name={event.icon} size={11} strokeWidth={2.5} />
                  </span>

                  <div className="tl-card">
                    <p className="tl-title">
                      {event.title}
                      {event.badge && (
                        <span className="badge round dim">{event.badge}</span>
                      )}
                    </p>

                    <p className="tl-meta">
                      {event.detail && <span>{event.detail}</span>}
                      {event.actor && (
                        <span className="tl-actor">
                          <Avatar
                            name={event.actor.fullName || event.actor.username}
                            size="sm"
                          />
                          {event.actor.username}
                        </span>
                      )}
                      <time
                        dateTime={event.at.toISOString()}
                        title={exact(event.at)}
                      >
                        {timeAgo(event.at)}
                      </time>
                    </p>
                  </div>
                </li>
              ))}
            </Fragment>
          ))}

          {events.length === 0 && (
            <li className="tl-item tl-empty">
              <span className="tl-node" aria-hidden="true" />
              <div className="tl-card">
                <p className="muted small">
                  Nothing has happened yet. Add a task or a member and it will
                  show up here.
                </p>
              </div>
            </li>
          )}
        </ol>
      )}

      {shown < events.length && (
        <button
          type="button"
          className="ghost tl-more"
          onClick={() => setShown((n) => n + PAGE)}
        >
          <Icon name="chevronDown" size={14} />
          Show earlier activity ({events.length - shown} more)
        </button>
      )}
    </section>
  );
};

export default Timeline;
