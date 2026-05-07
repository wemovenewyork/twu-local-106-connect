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
