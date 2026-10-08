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

          <button type="button" className="ghost small" onClick={logout}>
            Sign out
          </button>
        </div>
      </header>
      {!user.isEmailVerified && (
        <div className="banner warn" role="status">
          <span>
            <strong>Verify your email to make changes.</strong> You can look
            around, but creating and editing is disabled until you confirm your
            address.
          </span>
          <Link to="/account">Resend the link →</Link>
        </div>
      )}

      <main className="page">{children}</main>
    </>
  );
};

export default Layout;
