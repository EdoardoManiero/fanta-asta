import { ROLE_COLORS } from '../format.js';

export default function RoleBadge({ role }) {
  return (
    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-md border text-[11px] font-bold ${ROLE_COLORS[role] || ''}`}>
      {role}
    </span>
  );
}
