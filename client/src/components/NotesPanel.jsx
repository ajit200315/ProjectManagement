import { useCallback, useState } from "react";
import { noteApi } from "../api/client.js";
import { useResource } from "../hooks/useResource.js";
import ErrorBanner from "./ErrorBanner.jsx";
import Pager from "./Pager.jsx";

const NotesPanel = ({ projectId, canManage }) => {
  const [page, setPage] = useState(1);
  const load = useCallback(
    () => noteApi.list(projectId, { page, limit: 10 }),
    [projectId, page],
  );
  const { data, loading, error, refresh, setError } = useResource(load);
  const notes = data?.items ?? [];

  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(null);
  const [editDraft, setEditDraft] = useState("");
  const [busy, setBusy] = useState(false);

  const run = async (action) => {
    setBusy(true);
    setError("");
    try {
      await action();
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const add = (event) => {
    event.preventDefault();
    const content = draft.trim();
    if (!content) return;
    return run(async () => {
      await noteApi.create(projectId, content);
      setDraft("");
      // Newest sorts first, so jump back to page one to reveal it.
      setPage(1);
    });
  };

  const saveEdit = (event) => {
    event.preventDefault();
    const content = editDraft.trim();
    if (!content) return;
    return run(async () => {
      await noteApi.update(projectId, editing, content);
      setEditing(null);
      setEditDraft("");
    });
  };

  return (
    <section className="panel">
      <div className="section-head">
        <h2>Notes</h2>
      </div>

      <ErrorBanner error={error} onDismiss={() => setError("")} />

      {loading && <p className="muted small">Loading notes…</p>}

      {!loading && notes.length === 0 && (
        <p className="muted small">No notes yet.</p>
      )}

      <ul className="notes">
        {notes.map((note) => (
          <li key={note._id}>
            {editing === note._id ? (
              <form className="note-edit" onSubmit={saveEdit}>
                <textarea
                  aria-label="Edit note"
                  value={editDraft}
                  onChange={(event) => setEditDraft(event.target.value)}
                  rows={3}
                  autoFocus
                />
                <div className="actions">
                  <button type="submit" className="small" disabled={busy}>
                    Save
                  </button>
                  <button
                    type="button"
                    className="ghost small"
                    onClick={() => setEditing(null)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <>
                <p className="note-body">{note.content}</p>
                <div className="note-foot">
                  <span className="muted small">
                    {note.createdBy?.username
                      ? `@${note.createdBy.username}`
                      : "—"}
                  </span>
                  {canManage && (
                    <span className="actions">
                      <button
                        type="button"
                        className="link"
                        onClick={() => {
                          setEditing(note._id);
                          setEditDraft(note.content);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="link danger"
                        disabled={busy}
                        onClick={() =>
                          run(() => noteApi.remove(projectId, note._id))
                        }
                      >
                        Delete
                      </button>
                    </span>
                  )}
                </div>
              </>
            )}
          </li>
        ))}
      </ul>

      <Pager pagination={data?.pagination} onPage={setPage} busy={loading} />

      {canManage && (
        <form className="note-add" onSubmit={add}>
          <textarea
            aria-label="New note"
            placeholder="Add a note"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={2}
          />
          <button type="submit" className="ghost small" disabled={busy}>
            Add note
          </button>
        </form>
      )}
    </section>
  );
};

export default NotesPanel;
