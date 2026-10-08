import { describe, expect, it } from "vitest";
import { buildTimeline, groupByDay, summarize } from "./projectTimeline.js";

const iso = (s) => new Date(s).toISOString();

const project = {
  _id: "p1",
  name: "Apollo",
  createdBy: "u1",
  createdAt: iso("2026-03-01T10:00:00Z"),
  updatedAt: iso("2026-03-01T10:00:00Z"),
};

const members = [
  {
    _id: "m1",
    role: "admin",
    user: { _id: "u1", username: "ana", fullName: "Ana Díaz" },
    // Written in the same request that created the project.
    createdAt: iso("2026-03-01T10:00:00.400Z"),
  },
  {
    _id: "m2",
    role: "member",
    user: { _id: "u2", username: "bo" },
    createdAt: iso("2026-03-04T09:00:00Z"),
  },
];

describe("buildTimeline", () => {
  it("opens with the project being created and names the founder", () => {
    const events = buildTimeline({ project, members, tasks: [] });
    const first = events.at(-1);

    expect(first.kind).toBe("founded");
    expect(first.actor.fullName).toBe("Ana Díaz");
  });

  it("does not report the founder as having joined", () => {
    const events = buildTimeline({ project, members, tasks: [] });
    const joins = events.filter((e) => e.kind === "joined");

    expect(joins).toHaveLength(1);
    expect(joins[0].title).toContain("bo");
  });

  it("reports an edit only when the project was written later", () => {
    const untouched = buildTimeline({ project, members: [], tasks: [] });
    expect(untouched.some((e) => e.kind === "edited")).toBe(false);

    const edited = buildTimeline({
      project: { ...project, updatedAt: iso("2026-03-06T12:00:00Z") },
      members: [],
      tasks: [],
    });
    expect(edited.some((e) => e.kind === "edited")).toBe(true);
  });

  it("adds a second event for a task that was written after creation", () => {
    const events = buildTimeline({
      project,
      members,
      tasks: [
        {
          _id: "t1",
          title: "Ship the API",
          status: "done",
          priority: "high",
          createdAt: iso("2026-03-02T08:00:00Z"),
          updatedAt: iso("2026-03-05T16:30:00Z"),
        },
        {
          _id: "t2",
          title: "Write the docs",
          status: "todo",
          priority: "medium",
          createdAt: iso("2026-03-02T08:00:01Z"),
          updatedAt: iso("2026-03-02T08:00:01Z"),
        },
      ],
    });

    const kinds = events.map((e) => e.kind);
    expect(kinds).toContain("task-done");
    // t2 was never touched again, so it contributes creation only.
    expect(events.filter((e) => e.id.startsWith("task-t2"))).toHaveLength(1);
  });

  it("returns newest first", () => {
    const events = buildTimeline({ project, members, tasks: [] });
    const times = events.map((e) => e.at.getTime());

    expect(times).toEqual([...times].sort((a, b) => b - a));
  });

  it("survives missing and malformed timestamps", () => {
    const events = buildTimeline({
      project: { ...project, createdAt: null },
      members: [{ _id: "m3", user: null, createdAt: "not a date" }],
      tasks: [{ _id: "t3", title: "Orphan", status: "todo" }],
    });

    expect(events).toEqual([]);
  });
});

describe("summarize", () => {
  const now = new Date("2026-03-10T00:00:00Z");

  it("counts status, overdue and progress", () => {
    const stats = summarize(
      {
        members,
        tasks: [
          { status: "done" },
          { status: "done" },
          { status: "todo", dueDate: iso("2026-03-01T00:00:00Z") },
          { status: "in_progress" },
        ],
      },
      now,
    );

    expect(stats.total).toBe(4);
    expect(stats.done).toBe(2);
    expect(stats.overdue).toBe(1);
    expect(stats.members).toBe(2);
    expect(stats.percent).toBe(50);
  });

  it("never rounds up to a finished project while work is open", () => {
    const tasks = Array.from({ length: 200 }, (_, i) => ({
      status: i === 0 ? "todo" : "done",
    }));

    expect(summarize({ tasks }, now).percent).toBe(99);
  });

  it("does not count a finished task as overdue", () => {
    const stats = summarize(
      { tasks: [{ status: "done", dueDate: iso("2026-01-01T00:00:00Z") }] },
      now,
    );

    expect(stats.overdue).toBe(0);
    expect(stats.percent).toBe(100);
  });

  it("reports an empty project as zero rather than NaN", () => {
    expect(summarize({}, now)).toMatchObject({ total: 0, percent: 0 });
  });
});

describe("groupByDay", () => {
  it("collects same-day events and labels today and yesterday", () => {
    const now = new Date("2026-03-10T12:00:00Z");
    const groups = groupByDay(
      [
        { at: new Date("2026-03-10T11:00:00Z") },
        { at: new Date("2026-03-10T09:00:00Z") },
        { at: new Date("2026-03-09T09:00:00Z") },
      ],
      now,
    );

    expect(groups).toHaveLength(2);
    expect(groups[0].label).toBe("Today");
    expect(groups[0].events).toHaveLength(2);
    expect(groups[1].label).toBe("Yesterday");
  });
});
