import Icon from "./Icon.jsx";

const ErrorBanner = ({ error, onDismiss }) => {
  if (!error) return null;

  return (
    <p className="alert" role="alert">
      <span className="alert-body">
        <Icon name="x" size={14} className="alert-icon" />
        {error}
      </span>
      {onDismiss && (
        <button type="button" className="link" onClick={onDismiss}>
          Dismiss
        </button>
      )}
    </p>
  );
};

export default ErrorBanner;
