import { createContext, useContext } from "react";

// Kept apart from AuthProvider so that file exports only a component,
// which is what React's fast refresh needs to work.
export const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside an AuthProvider");
  }
  return context;
};
