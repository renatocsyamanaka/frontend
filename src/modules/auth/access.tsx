export function normalizePermissions(value: unknown): string[] {
  if (Array.isArray(value)) {
    const arr = value
      .map((p) => String(p || '').trim().toUpperCase())
      .filter(Boolean);

    return [...new Set(arr)];
  }

  if (typeof value === 'string' && value.trim()) {
    const arr = value
      .split(',')
      .map((p) => String(p || '').trim().toUpperCase())
      .filter(Boolean);

    return [...new Set(arr)];
  }

  return [];
}

export function getUserLevel(user: any): number {
  return Number(user?.role?.level || user?.roleLevel || 0);
}

export function hasPermission(user: any, permission?: string | string[]): boolean {
  if (!user) return false;

  const level = getUserLevel(user);

  // gerente pra cima = acesso total
  if (level >= 5) return true;

  if (!permission) return true;

  const userPermissions = normalizePermissions(user?.permissions);
  const needed = Array.isArray(permission) ? permission : [permission];

  return needed.some((p) =>
    userPermissions.includes(String(p || '').trim().toUpperCase())
  );
}

export function canAccess(user: any, permission?: string | string[]): boolean {
  return hasPermission(user, permission);
}