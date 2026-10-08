import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { authApi } from "../api/client.js";
import AuthShell from "../components/AuthShell.jsx";

/**
 * Target of the link in the verification email.
 *
 * Unlike the other pages this one performs a mutation on load: the token is
 * consumed by the first request and is invalid afterwards. It therefore must
 * not use the read-style useResource hook, and must fire exactly once — in
 * development StrictMode mounts effects twice, and the second call would
 * report "invalid or expired" for an account that was just verified.
 */
const VerifyEmail = () => {
  const { verificationToken: token } = useParams();
  const [state, setState] = useState({ status: "verifying", message: "" });
  const requested = useRef(null);

  useEffect(() => {
    if (requested.current === token) return;
    requested.current = token;

    authApi
      .verifyEmail(token)
      .then(() => setState({ status: "verified", message: "" }))
      .catch((err) => setState({ status: "failed", message: err.message }));
  }, [token]);

  return (
    <AuthShell
      title="Email verification"
      footer={
        state.status !== "verifying" ? (
          <Link to="/login">Go to sign in</Link>
        ) : undefined
      }
    >
      {state.status === "verifying" && <p>Verifying your email…</p>}

      {state.status === "verified" && <p>Your email is verified.</p>}

      {state.status === "failed" && (
        <>
          <p>{state.message}</p>
          <p>
            This link works only once, so it may already have been used. Sign in
            to check — if your email still shows as unverified, request a new
            link from your account page.
          </p>
        </>
      )}
    </AuthShell>
  );
};

export default VerifyEmail;
