import Icon from "./Icon.jsx";

const ErrorBanner = ({ error, onDismiss }) => {
  if (!error) return null;

  return (
    <p role="alert">
      <span>
        <Icon name="x" size={14} />
        {error}
      </span>
      {onDismiss && (
        <button type="button" onClick={onDismiss}>
          Dismiss
        </button>
      )}
    </p>
  );
};

export default ErrorBanner;
