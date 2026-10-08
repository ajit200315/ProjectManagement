import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../context/auth-context.js";
import Avatar from "./Avatar.jsx";
import Icon from "./Icon.jsx";

const navClass = ({ isActive }) => `side-link ${isActive ? "active" : ""}`;

const Layout = ({ children }) => {
  const { user, logout } = useAuth();

  return (
    <div className="app">
      <aside className="sidebar">
        <Link to="/" className="brand">
          <span className="brand-mark">
            <Icon name="board" size={15} />
          </span>
          <span className="brand-name">Workspace</span>
        </Link>

        <nav className="side-nav" aria-label="Main">
          <p className="side-label">Planning</p>
          <NavLink to="/" end className={navClass}>
            <Icon name="folder" />
            Projects
          </NavLink>
          <NavLink to="/account" className={navClass}>
            <Icon name="user" />
            Account
          </NavLink>
        </nav>

        <div className="sidebar-foot">
          <Avatar name={user.fullName || user.username} />
          <span className="sidebar-who">
            <strong>{user.username}</strong>
          </span>
          <button
            type="button"
            className="icon"
            onClick={logout}
            title="Sign out"
            aria-label="Sign out"
          >
            <Icon name="logout" />
          </button>
        </div>
      </aside>

      <div className="app-main">
        {!user.isEmailVerified && (
          <div className="banner warn" role="status">
            <span>
              <strong>Verify your email to make changes.</strong> You can look
              around, but creating and editing is disabled until you confirm
              your address.
            </span>
            <Link to="/account">Resend the link →</Link>
          </div>
        )}

        <main className="page">{children}</main>
      </div>
    </div>
  );
};

export default Layout;
