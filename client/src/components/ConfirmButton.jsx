import { useEffect, useRef, useState } from "react";

/**
 * Two-step confirm for destructive actions.
 *
 * Deliberately not window.confirm: a native dialog blocks the page, cannot be
 * styled, and reads poorly on mobile. The armed state reverts on its own so a
 * stray first click does not leave a primed delete button sitting there.
 */
const ConfirmButton = ({
  onConfirm,
  children,
  confirmLabel = "Confirm",
  className = "ghost danger",
  disabled = false,
  timeout = 4000,
}) => {
  const [armed, setArmed] = useState(false);
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  const handleClick = () => {
    if (!armed) {
      setArmed(true);
      timer.current = setTimeout(() => setArmed(false), timeout);
      return;
    }
    clearTimeout(timer.current);
    setArmed(false);
    onConfirm();
  };

  return (
    <button
      type="button"
      className={className}
      onClick={handleClick}
      disabled={disabled}
      aria-live="polite"
    >
      {armed ? confirmLabel : children}
    </button>
  );
};

export default ConfirmButton;
