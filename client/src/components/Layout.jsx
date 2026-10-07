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
          <span className="muted">{user.username}</span>
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
