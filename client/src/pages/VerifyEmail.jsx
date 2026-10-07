import { useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import { authApi } from "../api/client.js";
import { useResource } from "../hooks/useResource.js";

/** Target of the link in the verification email. */
const VerifyEmail = () => {
  const { verificationToken } = useParams();

  const verify = useCallback(
    () => authApi.verifyEmail(verificationToken),
    [verificationToken],
  );
  const { data, loading, error } = useResource(verify);

  return (
    <main className="shell">
      <div className="card">
        <h1>Email verification</h1>

        {loading && <p className="muted">Verifying your email…</p>}

        {!loading && error && (
          <>
            <p className="alert">{error}</p>
            <p className="muted">
              The link may have expired. Sign in and request a new one from your
              account page.
            </p>
          </>
        )}

        {!loading && data && (
          <p className="muted">Your email is verified. You can sign in now.</p>
        )}

        {!loading && (
          <p className="muted">
            <Link to="/login">Go to sign in</Link>
          </p>
        )}
      </div>
    </main>
  );
};

export default VerifyEmail;
