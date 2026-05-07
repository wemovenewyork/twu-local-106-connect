import type { UserRole } from "@/types";

/**
 * TWU Local 106 role hierarchy (least to most powerful):
 *   member         — verified TSO member, can use shift swap, read division content
 *   contributor    — member with limited write access (TBD in C2)
 *   editor         — can draft/edit news and documents within their division
 *   divisionAdmin  — manages content, members, and pushes for ONE division
 *   localAdmin     — manages content, members, and pushes for ALL divisions
 *   superAdmin     — full system access (technical admin tier)
 *
 * Division Admins are scoped to one division. Local Admins span all divisions.
 * Super Admins are the technical operator role; in practice held by 1-2 people.
 */

type RoleLike = { role: UserRole | string; divisionId?: string | null };

export function isLocalOrSuperAdmin(user: RoleLike): boolean {
  return user.role === "localAdmin" || user.role === "superAdmin";
}

export function isDivisionAdmin(user: RoleLike, divisionId?: string | null): boolean {
  if (isLocalOrSuperAdmin(user)) return true;
  if (user.role !== "divisionAdmin") return false;
  if (!divisionId) return true;
  return user.divisionId === divisionId;
}

export function canEditContent(user: RoleLike, divisionId?: string | null): boolean {
  if (isDivisionAdmin(user, divisionId)) return true;
  if (user.role !== "editor") return false;
  if (!divisionId) return true;
  return user.divisionId === divisionId;
}

/**
 * True if the user holds any admin tier (division/local/super).
 */
export function isAdmin(user: RoleLike): boolean {
  return (
    user.role === "divisionAdmin" ||
    user.role === "localAdmin" ||
    user.role === "superAdmin"
  );
}

/**
 * True if the user can manage all divisions (localAdmin or superAdmin).
 * Alias for isLocalOrSuperAdmin — kept for readability at call sites.
 */
export function isLocalAdmin(user: RoleLike): boolean {
  return isLocalOrSuperAdmin(user);
}

/**
 * True if the user can manage the given division.
 *
 *   - localAdmin / superAdmin: any division
 *   - divisionAdmin: only when their divisionId matches targetDivisionId
 *   - everyone else: false
 */
export function canManageDivision(user: RoleLike, targetDivisionId: string): boolean {
  if (isLocalOrSuperAdmin(user)) return true;
  if (user.role === "divisionAdmin" && user.divisionId === targetDivisionId) return true;
  return false;
}

/**
 * Returns the divisions a user can manage:
 *   - "all" for localAdmin / superAdmin
 *   - [divisionId] for divisionAdmin scoped to a division
 *   - [] for non-admins, or divisionAdmin without a divisionId
 *
 * Used by feature-area queries to filter to the admin's scope.
 */
export function getManageableDivisions(user: RoleLike): "all" | string[] {
  if (isLocalOrSuperAdmin(user)) return "all";
  if (user.role === "divisionAdmin" && user.divisionId) return [user.divisionId];
  return [];
}

/**
 * Authorize manage actions on a news record.
 *
 *   - localAdmin / superAdmin: any news, any status
 *   - divisionAdmin: news in their division (or all-divisions news matching
 *     null divisionId is local/super only — div admins don't get to manage
 *     all-divisions content)
 *   - editor: only their own drafts in their division
 *
 * Async signature is forward-compatible: future versions may consult the DB
 * to extend manage rights to sub-unit officers.
 */
type NewsLike = { authorId: string; divisionId: string | null; status: string };
export async function canManageNews(
  user: RoleLike & { id: string },
  news: NewsLike
): Promise<boolean> {
  if (isLocalOrSuperAdmin(user)) return true;

  if (user.role === "divisionAdmin" && news.divisionId && news.divisionId === user.divisionId) {
    return true;
  }

  if (
    user.role === "editor" &&
    news.authorId === user.id &&
    news.status === "draft" &&
    news.divisionId === user.divisionId
  ) {
    return true;
  }

  return false;
}
