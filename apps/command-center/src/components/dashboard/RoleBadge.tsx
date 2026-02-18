interface RoleBadgeProps {
  role: string;
}

export function RoleBadge({ role }: RoleBadgeProps) {
  const colorMap: Record<string, string> = {
    ADMIN: 'bg-caribbean-green text-white',
    MANAGER: 'bg-blue-600 text-white',
    SALES_REP: 'bg-caribbean-gold text-black',
    INVESTOR: 'bg-purple-600 text-white',
  };

  const displayName = role.replace('_', ' ');
  const colorClass = colorMap[role] || 'bg-gray-600 text-white';

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase ${colorClass}`}
    >
      {displayName}
    </span>
  );
}
