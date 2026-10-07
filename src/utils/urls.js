/**
 * Builds the links that go into emails.
 *
 * These must point at the client's routes, not the API's: the person clicking
 * the link is in a browser and should land on a page, not on raw JSON.
 */

const clientUrl = () =>
  (process.env.CLIENT_URL || "http://localhost:5173").replace(/\/+$/, "");

export const emailVerificationUrl = (token) =>
  `${clientUrl()}/verify-email/${token}`;

export const passwordResetUrl = (token) => {
  // FORGOT_PASSWORD_REDIRECT_URL stays supported for an existing deployment
  // that already sets it; otherwise derive it from CLIENT_URL.
  const base = process.env.FORGOT_PASSWORD_REDIRECT_URL?.replace(/\/+$/, "");
  return `${base || `${clientUrl()}/reset-password`}/${token}`;
};
