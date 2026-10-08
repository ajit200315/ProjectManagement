/**
 * Initials avatar.
 *
 * There are no uploaded images in the API, so identity is carried by the
 * initials of the name itself, without storing anything.
 */
const initials = (name) =>
  name
    .trim()
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "?";

const Avatar = ({ name, title }) => {
  if (!name) {
    return <span title={title ?? "Unassigned"}>?</span>;
  }

  return <span title={title ?? name}>{initials(name)}</span>;
};

export default Avatar;
