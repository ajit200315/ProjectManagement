import Icon from "./Icon.jsx";

/**
 * The frame shared by every signed-out screen: one centred card under the
 * product mark, so sign-in, register and the password flows read as the same
 * place rather than as four unrelated forms.
 */
const AuthShell = ({ title, subtitle, children, footer }) => (
  <main>
    <div>
      <p>
        <span>
          <Icon name="board" size={15} />
        </span>
        Workspace
      </p>

      <h1>{title}</h1>
      {subtitle && <p>{subtitle}</p>}

      {children}

      {footer && <p>{footer}</p>}
    </div>
  </main>
);

export default AuthShell;
