import { useRef, useState } from "react";
import { attachmentApi } from "../api/client.js";
import ConfirmButton from "./ConfirmButton.jsx";
import ErrorBanner from "./ErrorBanner.jsx";
import Icon from "./Icon.jsx";

const formatSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const Attachments = ({
  projectId,
  taskId,
  attachments,
  canDelete,
  onChanged,
}) => {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

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

  const onPick = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    return run(async () => {
      await attachmentApi.upload(projectId, taskId, file);
      // Let the same file be picked again after a failure or a delete.
      if (inputRef.current) inputRef.current.value = "";
      await onChanged();
    });
  };

  return (
    <div className="attachments">
      <p className="label-row">
        <Icon name="paperclip" size={12} /> Attachments
      </p>

      <ErrorBanner error={error} onDismiss={() => setError("")} />

      {attachments.length === 0 && <p className="muted small">None yet.</p>}

      <ul className="attachment-list">
        {attachments.map((file) => (
          <li key={file._id}>
            <button
              type="button"
              className="link"
              disabled={busy}
              onClick={() =>
                run(() => attachmentApi.download(projectId, taskId, file))
              }
            >
              {file.filename}
            </button>
            <span className="muted small">{formatSize(file.size)}</span>
            {canDelete && (
              <ConfirmButton
                className="icon danger"
                aria-label={`Delete ${file.filename}`}
                confirmLabel="Sure?"
                disabled={busy}
                onConfirm={() =>
                  run(async () => {
                    await attachmentApi.remove(projectId, taskId, file._id);
                    await onChanged();
                  })
                }
              >
                <Icon name="x" size={14} />
              </ConfirmButton>
            )}
          </li>
        ))}
      </ul>

      <input
        ref={inputRef}
        type="file"
        aria-label="Attach a file"
        className="file-input"
        onChange={onPick}
        disabled={busy}
      />
      {busy && <p className="muted small">Working…</p>}
    </div>
  );
};

export default Attachments;
