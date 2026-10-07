import { Link } from "react-router-dom";
import { useAuth } from "../context/auth-context.js";

const Layout = ({ children }) => {
  const { user, logout } = useAuth();

  return (
    <>
      <header className="topbar">
        <Link to="/" className="brand">
          Project Management
        </Link>
        <div className="topbar-right">
          <Link to="/account" className="muted">
            {user.username}
          </Link>
          {!user.isEmailVerified && (
            <Link to="/account" className="badge warn">
              Verify email
            </Link>
          )}
          <button type="button" className="ghost small" onClick={logout}>
            Sign out
          </button>
        </div>
      </header>
      <main className="page">{children}</main>
    </>
  );
};

export default Layout;
