import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../context/auth-context.js";
import Avatar from "./Avatar.jsx";
import Icon from "./Icon.jsx";

const Layout = ({ children }) => {
  const { user, logout } = useAuth();

  return (
    <div>
      <aside>
        <Link to="/">
          <span>
            <Icon name="board" size={15} />
          </span>
          <span>Workspace</span>
        </Link>

        <nav aria-label="Main">
          <p>Planning</p>
          <NavLink to="/" end>
            <Icon name="folder" />
            Projects
          </NavLink>
          <NavLink to="/account">
            <Icon name="user" />
            Account
          </NavLink>
        </nav>

        <div>
          <Avatar name={user.fullName || user.username} />
          <span>
            <strong>{user.username}</strong>
          </span>
          <button
            type="button"
            onClick={logout}
            title="Sign out"
            aria-label="Sign out"
          >
            <Icon name="logout" />
          </button>
        </div>
      </aside>

      <div>
        {!user.isEmailVerified && (
          <div role="status">
            <span>
              <strong>Verify your email to make changes.</strong> You can look
              around, but creating and editing is disabled until you confirm
              your address.
            </span>
            <Link to="/account">Resend the link →</Link>
          </div>
        )}

        <main>{children}</main>
      </div>
    </div>
  );
};

export default Layout;
