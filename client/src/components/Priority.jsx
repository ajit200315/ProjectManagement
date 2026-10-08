import { PRIORITY_LABEL, TASK_PRIORITY } from "../api/client.js";
import Icon from "./Icon.jsx";

/** Direction of the arrow carries the same meaning as the colour does. */
const ICON = {
  [TASK_PRIORITY.URGENT]: "chevronsUp",
  [TASK_PRIORITY.HIGH]: "chevronUp",
  [TASK_PRIORITY.MEDIUM]: "equals",
  [TASK_PRIORITY.LOW]: "chevronDown",
};

const Priority = ({ value }) => {
  if (!value) return null;

  return (
    <span className={`prio prio-${value}`}>
      <Icon name={ICON[value]} size={14} strokeWidth={2.5} />
      {PRIORITY_LABEL[value]}
    </span>
  );
};

export default Priority;
