import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";

process.env.ACCESS_TOKEN_SECRET = "test-access-secret";
process.env.REFRESH_TOKEN_SECRET = "test-refresh-secret";
process.env.ACCESS_TOKEN_EXPIRY = "1d";
process.env.REFRESH_TOKEN_EXPIRY = "10d";
process.env.FORGOT_PASSWORD_REDIRECT_URL = "http://localhost/reset";
process.env.NODE_ENV = "test";

const { default: app } = await import("../src/app.js");

let mongo;
const api = () => request(app);

const admin = {
  email: "admin@example.com",
  username: "adminuser",
  password: "password123",
  fullName: "Admin User",
};
const member = {
  email: "member@example.com",
  username: "memberuser",
  password: "password123",
};

let adminToken, memberToken, outsiderToken, memberId;
let projectId, taskId, subTaskId, noteId, attachmentId;

test("boot in-memory mongo", async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  assert.equal(mongoose.connection.readyState, 1);
});

test("healthcheck responds", async () => {
  const res = await api().get("/api/v1/healthcheck").expect(200);
  assert.equal(res.body.success, true);
});

test("responses carry the helmet security headers", async () => {
  const res = await api().get("/api/v1/healthcheck").expect(200);
  assert.equal(res.headers["x-content-type-options"], "nosniff");
  assert.ok(
    res.headers["x-frame-options"] || res.headers["content-security-policy"],
  );
  // helmet strips the header that advertises the stack.
  assert.equal(res.headers["x-powered-by"], undefined);
});

test("unknown route returns a 404 as JSON", async () => {
  const res = await api().get("/api/v1/nope").expect(404);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /not found/i);
});

test("register rejects a short password", async () => {
  const res = await api()
    .post("/api/v1/auth/register")
    .send({ ...admin, password: "short" })
    .expect(422);
  assert.equal(res.body.success, false);
});

test("register creates both users", async () => {
  const res = await api().post("/api/v1/auth/register").send(admin).expect(201);
  assert.equal(res.body.data.user.username, admin.username);
  assert.equal(res.body.data.user.fullName, admin.fullName);
  assert.equal(res.body.data.user.password, undefined);

  const res2 = await api()
    .post("/api/v1/auth/register")
    .send(member)
    .expect(201);
  memberId = res2.body.data.user._id;
});

test("register refuses a duplicate email", async () => {
  await api().post("/api/v1/auth/register").send(admin).expect(409);
});

test("login works by email and by username", async () => {
  const byEmail = await api()
    .post("/api/v1/auth/login")
    .send({ email: admin.email, password: admin.password })
    .expect(200);
  adminToken = byEmail.body.data.accessToken;
  assert.ok(adminToken);

  const byUsername = await api()
    .post("/api/v1/auth/login")
    .send({ username: member.username, password: member.password })
    .expect(200);
  memberToken = byUsername.body.data.accessToken;
  assert.ok(memberToken);
});

test("login rejects a wrong password", async () => {
  await api()
    .post("/api/v1/auth/login")
    .send({ email: admin.email, password: "wrongpassword" })
    .expect(401);
});

test("protected route needs a token", async () => {
  await api().get("/api/v1/auth/current-user").expect(401);
});

test("current-user returns the logged in user", async () => {
  const res = await api()
    .get("/api/v1/auth/current-user")
    .set("Authorization", `Bearer ${adminToken}`)
    .expect(200);
  assert.equal(res.body.data.email, admin.email);
});

test("change password, then log in with the new one", async () => {
  await api()
    .post("/api/v1/auth/change-password")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ oldPassword: admin.password, newPassword: "newpassword123" })
    .expect(200);

  const res = await api()
    .post("/api/v1/auth/login")
    .send({ email: admin.email, password: "newpassword123" })
    .expect(200);
  adminToken = res.body.data.accessToken;
});

test("refresh token issues a new access token", async () => {
  const login = await api()
    .post("/api/v1/auth/login")
    .send({ email: admin.email, password: "newpassword123" })
    .expect(200);

  const res = await api()
    .post("/api/v1/auth/refresh-token")
    .send({ refreshToken: login.body.data.refreshToken })
    .expect(200);
  assert.ok(res.body.data.accessToken);
  adminToken = res.body.data.accessToken;
});

test("forgot-password does not leak whether an email exists", async () => {
  const known = await api()
    .post("/api/v1/auth/forgot-password")
    .send({ email: admin.email })
    .expect(200);
  const unknown = await api()
    .post("/api/v1/auth/forgot-password")
    .send({ email: "nobody@example.com" })
    .expect(200);
  assert.equal(known.body.message, unknown.body.message);
});

test("create a project; creator becomes its admin", async () => {
  const res = await api()
    .post("/api/v1/projects")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ name: "Apollo", description: "First project" })
    .expect(201);
  projectId = res.body.data._id;

  const list = await api()
    .get("/api/v1/projects")
    .set("Authorization", `Bearer ${adminToken}`)
    .expect(200);
  assert.equal(list.body.data.items.length, 1);
  assert.equal(list.body.data.items[0].role, "admin");
  assert.equal(list.body.data.items[0].project.name, "Apollo");
  assert.equal(list.body.data.items[0].project.members, 1);
  assert.equal(list.body.data.pagination.total, 1);
});

test("a non-member cannot read the project", async () => {
  await api()
    .get(`/api/v1/projects/${projectId}`)
    .set("Authorization", `Bearer ${memberToken}`)
    .expect(403);
});

test("two users may each have a project of the same name", async () => {
  await api()
    .post("/api/v1/projects")
    .set("Authorization", `Bearer ${memberToken}`)
    .send({ name: "Apollo" })
    .expect(201);
});

test("add the second user as a member", async () => {
  await api()
    .post(`/api/v1/projects/${projectId}/members`)
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ email: member.email, role: "member" })
    .expect(201);

  const res = await api()
    .get(`/api/v1/projects/${projectId}/members`)
    .set("Authorization", `Bearer ${adminToken}`)
    .expect(200);
  assert.equal(res.body.data.length, 2);
  // the users lookup must actually resolve
  assert.ok(res.body.data.every((m) => m.user?.username));
});

test("the member can now read the project", async () => {
  await api()
    .get(`/api/v1/projects/${projectId}`)
    .set("Authorization", `Bearer ${memberToken}`)
    .expect(200);
});

test("the last admin cannot be demoted or removed", async () => {
  const demote = await api()
    .put(
      `/api/v1/projects/${projectId}/members/${(await mongoose.connection.collection("users").findOne({ email: admin.email }))._id}`,
    )
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ newRole: "member" })
    .expect(400);
  assert.match(demote.body.message, /at least one admin/i);
});

test("create a task, assigned to the member", async () => {
  const res = await api()
    .post(`/api/v1/projects/${projectId}/tasks`)
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ title: "Write docs", description: "README", assignedTo: memberId })
    .expect(201);
  taskId = res.body.data._id;
  assert.equal(res.body.data.status, "todo");
});

test("a task cannot be assigned to a non-member", async () => {
  const outsider = await api()
    .post("/api/v1/auth/register")
    .send({
      email: "outsider@example.com",
      username: "outsider",
      password: "password123",
    })
    .expect(201);

  const res = await api()
    .post(`/api/v1/projects/${projectId}/tasks`)
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ title: "Nope", assignedTo: outsider.body.data.user._id })
    .expect(400);
  assert.match(res.body.message, /not a member/i);

  const login = await api()
    .post("/api/v1/auth/login")
    .send({ email: "outsider@example.com", password: "password123" })
    .expect(200);
  outsiderToken = login.body.data.accessToken;
});

test("a plain member cannot create a task", async () => {
  await api()
    .post(`/api/v1/projects/${projectId}/tasks`)
    .set("Authorization", `Bearer ${memberToken}`)
    .send({ title: "Sneaky" })
    .expect(403);
});

test("an invalid status is rejected", async () => {
  await api()
    .put(`/api/v1/projects/${projectId}/tasks/${taskId}`)
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ status: "banana" })
    .expect(422);
});

test("a partial update leaves other fields intact", async () => {
  const res = await api()
    .put(`/api/v1/projects/${projectId}/tasks/${taskId}`)
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ status: "in_progress" })
    .expect(200);
  assert.equal(res.body.data.status, "in_progress");
  assert.equal(res.body.data.title, "Write docs");
  assert.equal(res.body.data.description, "README");
});

test("a task can be unassigned by sending assignedTo: null", async () => {
  const res = await api()
    .put(`/api/v1/projects/${projectId}/tasks/${taskId}`)
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ assignedTo: null })
    .expect(200);
  assert.equal(res.body.data.assignedTo, null);

  // put it back for the tests that follow
  await api()
    .put(`/api/v1/projects/${projectId}/tasks/${taskId}`)
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ assignedTo: memberId })
    .expect(200);
});

test("subtasks: create, tick off as a member, and fetch with the task", async () => {
  const created = await api()
    .post(`/api/v1/projects/${projectId}/tasks/${taskId}/subtasks`)
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ title: "Outline" })
    .expect(201);
  subTaskId = created.body.data._id;
  assert.equal(created.body.data.isCompleted, false);

  await api()
    .put(`/api/v1/projects/${projectId}/tasks/${taskId}/subtasks/${subTaskId}`)
    .set("Authorization", `Bearer ${memberToken}`)
    .send({ isCompleted: true })
    .expect(200);

  const res = await api()
    .get(`/api/v1/projects/${projectId}/tasks/${taskId}`)
    .set("Authorization", `Bearer ${adminToken}`)
    .expect(200);
  assert.equal(res.body.data.subtasks.length, 1);
  assert.equal(res.body.data.subtasks[0].isCompleted, true);
  assert.equal(res.body.data.assignedTo.username, member.username);
});

test("tasks can be filtered by status", async () => {
  const res = await api()
    .get(`/api/v1/projects/${projectId}/tasks?status=in_progress`)
    .set("Authorization", `Bearer ${adminToken}`)
    .expect(200);
  assert.equal(res.body.data.items.length, 1);

  const none = await api()
    .get(`/api/v1/projects/${projectId}/tasks?status=done`)
    .set("Authorization", `Bearer ${adminToken}`)
    .expect(200);
  assert.equal(none.body.data.items.length, 0);
  assert.equal(none.body.data.pagination.total, 0);
});

test("a task id from another project is not reachable", async () => {
  const other = await api()
    .post("/api/v1/projects")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ name: "Zeus" })
    .expect(201);

  await api()
    .get(`/api/v1/projects/${other.body.data._id}/tasks/${taskId}`)
    .set("Authorization", `Bearer ${adminToken}`)
    .expect(404);
});

test("tasks accept a priority and a due date", async () => {
  const due = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const res = await api()
    .post(`/api/v1/projects/${projectId}/tasks`)
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ title: "Ship it", priority: "urgent", dueDate: due })
    .expect(201);

  assert.equal(res.body.data.priority, "urgent");
  assert.equal(new Date(res.body.data.dueDate).toISOString(), due);

  // and default to medium when unspecified
  const plain = await api()
    .post(`/api/v1/projects/${projectId}/tasks`)
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ title: "No priority given" })
    .expect(201);
  assert.equal(plain.body.data.priority, "medium");
  assert.equal(plain.body.data.dueDate, undefined);
});

test("an invalid priority or due date is rejected", async () => {
  await api()
    .post(`/api/v1/projects/${projectId}/tasks`)
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ title: "Bad", priority: "whenever" })
    .expect(422);

  await api()
    .post(`/api/v1/projects/${projectId}/tasks`)
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ title: "Bad", dueDate: "not-a-date" })
    .expect(422);
});

test("a due date can be cleared with an empty string", async () => {
  const res = await api()
    .put(`/api/v1/projects/${projectId}/tasks/${taskId}`)
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ dueDate: "" })
    .expect(200);
  assert.equal(res.body.data.dueDate, null);
});

test("tasks can be filtered by priority and to overdue only", async () => {
  const byPriority = await api()
    .get(`/api/v1/projects/${projectId}/tasks?priority=urgent`)
    .set("Authorization", `Bearer ${adminToken}`)
    .expect(200);
  assert.ok(byPriority.body.data.items.length >= 1);
  assert.ok(byPriority.body.data.items.every((t) => t.priority === "urgent"));

  // Nothing is overdue yet: the only dated task is a week out.
  const overdue = await api()
    .get(`/api/v1/projects/${projectId}/tasks?overdue=true`)
    .set("Authorization", `Bearer ${adminToken}`)
    .expect(200);
  assert.equal(overdue.body.data.items.length, 0);

  // Backdate one, and it should appear.
  const past = await api()
    .post(`/api/v1/projects/${projectId}/tasks`)
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ title: "Late", dueDate: "2020-01-01T00:00:00.000Z" })
    .expect(201);

  const nowOverdue = await api()
    .get(`/api/v1/projects/${projectId}/tasks?overdue=true`)
    .set("Authorization", `Bearer ${adminToken}`)
    .expect(200);
  assert.equal(nowOverdue.body.data.items.length, 1);
  assert.equal(nowOverdue.body.data.items[0]._id, past.body.data._id);

  // A completed task is never overdue, however old its due date.
  await api()
    .put(`/api/v1/projects/${projectId}/tasks/${past.body.data._id}`)
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ status: "done" })
    .expect(200);

  const afterDone = await api()
    .get(`/api/v1/projects/${projectId}/tasks?overdue=true`)
    .set("Authorization", `Bearer ${adminToken}`)
    .expect(200);
  assert.equal(afterDone.body.data.items.length, 0);
});

test("task lists page, and the page size is capped", async () => {
  const firstPage = await api()
    .get(`/api/v1/projects/${projectId}/tasks?limit=2&page=1`)
    .set("Authorization", `Bearer ${adminToken}`)
    .expect(200);

  const { items, pagination } = firstPage.body.data;
  assert.equal(items.length, 2);
  assert.equal(pagination.page, 1);
  assert.equal(pagination.limit, 2);
  assert.ok(pagination.total > 2);
  assert.equal(pagination.hasMore, true);

  const secondPage = await api()
    .get(`/api/v1/projects/${projectId}/tasks?limit=2&page=2`)
    .set("Authorization", `Bearer ${adminToken}`)
    .expect(200);

  // Pages must not overlap.
  const firstIds = items.map((t) => t._id);
  assert.ok(secondPage.body.data.items.every((t) => !firstIds.includes(t._id)));

  // A caller cannot ask for an unbounded page.
  const huge = await api()
    .get(`/api/v1/projects/${projectId}/tasks?limit=100000`)
    .set("Authorization", `Bearer ${adminToken}`)
    .expect(200);
  assert.equal(huge.body.data.pagination.limit, 100);

  // Garbage falls back to the default rather than erroring.
  const junk = await api()
    .get(`/api/v1/projects/${projectId}/tasks?limit=abc&page=-5`)
    .set("Authorization", `Bearer ${adminToken}`)
    .expect(200);
  assert.equal(junk.body.data.pagination.limit, 20);
  assert.equal(junk.body.data.pagination.page, 1);
});

test("tasks can be sorted by due date", async () => {
  const res = await api()
    .get(`/api/v1/projects/${projectId}/tasks?sort=dueDate&order=asc&limit=100`)
    .set("Authorization", `Bearer ${adminToken}`)
    .expect(200);

  const dates = res.body.data.items
    .map((t) => t.dueDate)
    .filter(Boolean)
    .map((d) => new Date(d).getTime());
  const sorted = [...dates].sort((a, b) => a - b);
  assert.deepEqual(dates, sorted);
});

test("attachments: upload, list, download and delete", async () => {
  const contents = Buffer.from("col_a,col_b\n1,2\n");

  const uploaded = await api()
    .post(`/api/v1/projects/${projectId}/tasks/${taskId}/attachments`)
    .set("Authorization", `Bearer ${adminToken}`)
    .attach("file", contents, "data.csv")
    .expect(201);

  assert.equal(uploaded.body.data.filename, "data.csv");
  assert.equal(uploaded.body.data.size, contents.length);
  assert.equal(uploaded.body.data.uploadedBy.username, admin.username);
  // The bytes must never ride along on metadata responses.
  assert.equal(uploaded.body.data.data, undefined);

  attachmentId = uploaded.body.data._id;

  const list = await api()
    .get(`/api/v1/projects/${projectId}/tasks/${taskId}/attachments`)
    .set("Authorization", `Bearer ${memberToken}`)
    .expect(200);
  assert.equal(list.body.data.length, 1);
  assert.equal(list.body.data[0].data, undefined);

  const download = await api()
    .get(
      `/api/v1/projects/${projectId}/tasks/${taskId}/attachments/${attachmentId}`,
    )
    .set("Authorization", `Bearer ${adminToken}`)
    .expect(200);
  assert.deepEqual(download.body, contents);
});

test("a download is forced, never rendered inline", async () => {
  const res = await api()
    .get(
      `/api/v1/projects/${projectId}/tasks/${taskId}/attachments/${attachmentId}`,
    )
    .set("Authorization", `Bearer ${adminToken}`)
    .expect(200);

  // Serving an uploaded HTML or SVG inline would run it in our own origin.
  assert.match(res.headers["content-disposition"], /^attachment;/);
  assert.equal(res.headers["content-type"], "application/octet-stream");
  assert.equal(res.headers["x-content-type-options"], "nosniff");
});

test("the task detail includes its attachments", async () => {
  const res = await api()
    .get(`/api/v1/projects/${projectId}/tasks/${taskId}`)
    .set("Authorization", `Bearer ${adminToken}`)
    .expect(200);
  assert.equal(res.body.data.attachments.length, 1);
  assert.equal(res.body.data.attachments[0].filename, "data.csv");
});

test("an attachment is not reachable through another task", async () => {
  const other = await api()
    .post(`/api/v1/projects/${projectId}/tasks`)
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ title: "Unrelated" })
    .expect(201);

  await api()
    .get(
      `/api/v1/projects/${projectId}/tasks/${other.body.data._id}/attachments/${attachmentId}`,
    )
    .set("Authorization", `Bearer ${adminToken}`)
    .expect(404);
});

test("a non-member cannot download an attachment", async () => {
  await api()
    .get(
      `/api/v1/projects/${projectId}/tasks/${taskId}/attachments/${attachmentId}`,
    )
    .set("Authorization", `Bearer ${outsiderToken}`)
    .expect(403);
});

test("an oversized upload is refused with 413", async () => {
  const tooBig = Buffer.alloc(6 * 1024 * 1024, 0x41);
  const res = await api()
    .post(`/api/v1/projects/${projectId}/tasks/${taskId}/attachments`)
    .set("Authorization", `Bearer ${adminToken}`)
    .attach("file", tooBig, "big.bin")
    .expect(413);
  assert.match(res.body.message, /too large/i);
});

test("a plain member may attach, but only a manager may delete", async () => {
  const mine = await api()
    .post(`/api/v1/projects/${projectId}/tasks/${taskId}/attachments`)
    .set("Authorization", `Bearer ${memberToken}`)
    .attach("file", Buffer.from("notes"), "member.txt")
    .expect(201);

  await api()
    .delete(
      `/api/v1/projects/${projectId}/tasks/${taskId}/attachments/${mine.body.data._id}`,
    )
    .set("Authorization", `Bearer ${memberToken}`)
    .expect(403);

  await api()
    .delete(
      `/api/v1/projects/${projectId}/tasks/${taskId}/attachments/${mine.body.data._id}`,
    )
    .set("Authorization", `Bearer ${adminToken}`)
    .expect(200);
});

test("notes: create, list and read", async () => {
  const created = await api()
    .post(`/api/v1/projects/${projectId}/notes`)
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ content: "Kickoff on Monday" })
    .expect(201);
  noteId = created.body.data._id;
  assert.equal(created.body.data.createdBy.username, admin.username);

  const list = await api()
    .get(`/api/v1/projects/${projectId}/notes`)
    .set("Authorization", `Bearer ${memberToken}`)
    .expect(200);
  assert.equal(list.body.data.items.length, 1);
  assert.equal(list.body.data.pagination.total, 1);

  const one = await api()
    .get(`/api/v1/projects/${projectId}/notes/${noteId}`)
    .set("Authorization", `Bearer ${adminToken}`)
    .expect(200);
  assert.equal(one.body.data.content, "Kickoff on Monday");
});

test("an empty note is rejected", async () => {
  await api()
    .post(`/api/v1/projects/${projectId}/notes`)
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ content: "   " })
    .expect(422);
});

test("a malformed project id gives 400, not a 500", async () => {
  await api()
    .get("/api/v1/projects/not-an-id")
    .set("Authorization", `Bearer ${adminToken}`)
    .expect(400);
});

test("a malformed member id gives 422, not a 500", async () => {
  await api()
    .delete(`/api/v1/projects/${projectId}/members/not-an-id`)
    .set("Authorization", `Bearer ${adminToken}`)
    .expect(422);
});

test("deleting a project cascades to its tasks, subtasks, notes and members", async () => {
  await api()
    .delete(`/api/v1/projects/${projectId}`)
    .set("Authorization", `Bearer ${adminToken}`)
    .expect(200);

  const db = mongoose.connection;
  const oid = new mongoose.Types.ObjectId(projectId);
  assert.equal(
    await db.collection("tasks").countDocuments({ project: oid }),
    0,
  );
  assert.equal(
    await db
      .collection("subtasks")
      .countDocuments({ _id: new mongoose.Types.ObjectId(subTaskId) }),
    0,
  );
  assert.equal(
    await db.collection("projectnotes").countDocuments({ project: oid }),
    0,
  );
  assert.equal(
    await db.collection("projectmembers").countDocuments({ project: oid }),
    0,
  );
});

test("logout clears the session", async () => {
  await api()
    .post("/api/v1/auth/logout")
    .set("Authorization", `Bearer ${adminToken}`)
    .expect(200);
});

test("teardown", async () => {
  await mongoose.disconnect();
  await mongo.stop();
});
