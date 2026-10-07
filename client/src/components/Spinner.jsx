const Spinner = ({ label = "Loading…" }) => (
  <p className="muted pad" role="status">
    {label}
  </p>
);

export default Spinner;
