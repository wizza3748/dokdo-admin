// This prototype has no operator login. Its local operator defaults to 최고관리.
// Server-only configuration also allows verifying restricted operator permissions.
export function canViewAdminWeekly(permissions: readonly string[]) {
  return permissions.includes("최고관리") || permissions.includes("운영관리")
}
export function adminWeeklyAllowed() {
  return canViewAdminWeekly((process.env.DOKDO_ADMIN_PERMISSIONS ?? "최고관리").split(",").map(value => value.trim()))
}
