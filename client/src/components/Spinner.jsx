const Spinner = ({ label = "Loading…" }) => (
  <p className="loading" role="status">
    <span className="spinner" aria-hidden="true" />
    {label}
  </p>
);

export default Spinner;
