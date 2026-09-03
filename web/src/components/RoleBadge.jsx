import { ROLE_COLORS } from '../format.js';

export default function RoleBadge({ role }) {
  return (
    <span
      className={`inline-flex h-5 w-5 items-center justify-center rounded border text-2xs font-semibold ${ROLE_COLORS[role] || ''}`}
    >
      {role}
    </span>
  );
}
