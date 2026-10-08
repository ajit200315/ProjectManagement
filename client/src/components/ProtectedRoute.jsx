import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/auth-context.js";

/** Gates a route behind a session, remembering where the user was headed. */
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <p>Loading…</p>;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
};

export default ProtectedRoute;
