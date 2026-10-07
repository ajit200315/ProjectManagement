const ErrorBanner = ({ error, onDismiss }) => {
  if (!error) return null;

  return (
    <p className="alert" role="alert">
      <span>{error}</span>
      {onDismiss && (
        <button type="button" className="link" onClick={onDismiss}>
          Dismiss
        </button>
      )}
    </p>
  );
};

export default ErrorBanner;
