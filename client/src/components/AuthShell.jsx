import Icon from "./Icon.jsx";

/**
 * The frame shared by every signed-out screen: one centred card under the
 * product mark, so sign-in, register and the password flows read as the same
 * place rather than as four unrelated forms.
 */
const AuthShell = ({ title, subtitle, children, footer }) => (
  <main className="shell">
    <div className="card">
      <p className="auth-brand">
        <span className="brand-mark">
          <Icon name="board" size={15} />
        </span>
        Workspace
      </p>

      <h1>{title}</h1>
      {subtitle && <p className="muted">{subtitle}</p>}

      {children}

      {footer && <p className="muted card-foot">{footer}</p>}
    </div>
  </main>
);

export default AuthShell;
