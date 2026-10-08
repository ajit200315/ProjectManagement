import { useCallback, useState } from "react";
import { noteApi } from "../api/client.js";
import { useResource } from "../hooks/useResource.js";
import ErrorBanner from "./ErrorBanner.jsx";
import Pager from "./Pager.jsx";
import Avatar from "./Avatar.jsx";
import Icon from "./Icon.jsx";

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
    <section>
      <div>
        <h2>
          <Icon name="note" size={15} /> Notes
        </h2>
      </div>

      <ErrorBanner error={error} onDismiss={() => setError("")} />

      {loading && <p>Loading notes…</p>}

      {!loading && notes.length === 0 && <p>No notes yet.</p>}

      <ul>
        {notes.map((note) => (
          <li key={note._id}>
            {editing === note._id ? (
              <form onSubmit={saveEdit}>
                <textarea
                  aria-label="Edit note"
                  value={editDraft}
                  onChange={(event) => setEditDraft(event.target.value)}
                  rows={3}
                  autoFocus
                />
                <div>
                  <button type="submit" disabled={busy}>
                    Save
                  </button>
                  <button type="button" onClick={() => setEditing(null)}>
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <>
                <p>{note.content}</p>
                <div>
                  <span>
                    <Avatar name={note.createdBy?.username} />
                    <span>{note.createdBy?.username ?? "Unknown"}</span>
                  </span>
                  {canManage && (
                    <span>
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(note._id);
                          setEditDraft(note.content);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
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
        <form onSubmit={add}>
          <textarea
            aria-label="New note"
            placeholder="Add a note"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={2}
          />
          <button type="submit" disabled={busy}>
            Add note
          </button>
        </form>
      )}
    </section>
  );
};

export default NotesPanel;
