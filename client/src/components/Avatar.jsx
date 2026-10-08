/**
 * Initials avatar.
 *
 * There are no uploaded images in the API, so identity is carried by the
 * initials plus a colour derived from the name itself: the same person is
 * always the same colour, in every list, without storing anything.
 */
const COLORS = [
  "#0c66e4",
  "#6e5dc6",
  "#ae4787",
  "#c9372c",
  "#974f0c",
  "#206a83",
  "#216e4e",
  "#5b7f24",
];

const initials = (name) =>
  name
    .trim()
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "?";

const hue = (name) => {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) % 1_000_003;
  }
  return COLORS[hash % COLORS.length];
};

const Avatar = ({ name, size = "", title }) => {
  if (!name) {
    return (
      <span
        className={`avatar empty-seat ${size}`}
        title={title ?? "Unassigned"}
      >
        ?
      </span>
    );
  }

  return (
    <span
      className={`avatar ${size}`}
      style={{ background: hue(name) }}
      title={title ?? name}
    >
      {initials(name)}
    </span>
  );
};

export default Avatar;
