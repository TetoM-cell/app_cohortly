type UserDisplayInput = {
  fullName?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
};

function prettifyEmailLocalPart(value: string) {
  return value
    .split(/[._-]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function getDisplayName(fullName?: string | null, email?: string | null) {
  const normalizedName = fullName?.trim();
  if (normalizedName) return normalizedName;

  const emailLocalPart = email?.split('@')[0]?.trim();
  if (emailLocalPart) return prettifyEmailLocalPart(emailLocalPart);

  return 'Unknown User';
}

export function getDisplayAvatar(avatarUrl?: string | null) {
  return avatarUrl?.trim() || undefined;
}

export function buildUserDisplay(input: UserDisplayInput) {
  return {
    name: getDisplayName(input.fullName, input.email),
    avatarUrl: getDisplayAvatar(input.avatarUrl),
  };
}
