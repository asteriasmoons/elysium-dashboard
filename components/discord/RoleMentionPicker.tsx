"use client";

type GuildRole = {
  id: string;
  name: string;
};

type Props = {
  roles: GuildRole[];
  search: string;
  onPick: (role: GuildRole) => void;
  className: string;
  itemClassName: string;
};

export default function RoleMentionPicker({
  roles,
  search,
  onPick,
  className,
  itemClassName,
}: Props) {
  const query = search.trim().toLowerCase();

  const filteredRoles = roles.filter((role) => {
    if (!query) return true;
    return role.name.toLowerCase().includes(query);
  });

  if (!filteredRoles.length) return null;

  return (
    <div className={className} role="listbox" aria-label="Role mention suggestions">
      {filteredRoles.slice(0, 8).map((role) => (
        <div
          key={role.id}
          role="option"
          aria-selected={false}
          tabIndex={0}
          className={itemClassName}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onPick(role)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onPick(role);
            }
          }}
        >
          @{role.name}
        </div>
      ))}
    </div>
  );
}
