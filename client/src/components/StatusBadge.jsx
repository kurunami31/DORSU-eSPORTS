import { statusMeta } from '../utils.js';

export default function StatusBadge({ status }) {
  const meta = statusMeta(status);
  return (
    <span className={`badge ${meta.badge}`}>
      <span className="dot" aria-hidden="true" />
      {meta.label}
    </span>
  );
}
