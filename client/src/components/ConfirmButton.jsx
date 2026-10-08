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
  ...rest
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
      // Armed widens an icon-only button so the confirm wording still fits.
      className={`${className}${armed ? " armed" : ""}`}
      onClick={handleClick}
      disabled={disabled}
      aria-live="polite"
      {...rest}
      // An icon button's aria-label names the action, but once armed the
      // visible wording is the question, and that is what must be announced.
      aria-label={armed ? confirmLabel : rest["aria-label"]}
    >
      {armed ? confirmLabel : children}
    </button>
  );
};

export default ConfirmButton;
