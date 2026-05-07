export interface Division {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  openSwaps?: number;
}

export type SwapCategory = "work" | "daysoff" | "vacation";
export type SwapStatus = "open" | "pending" | "filled" | "expired";

export interface Swap {
  id: string;
  userId: string;
  divisionId: string;
  category: SwapCategory;
  status: SwapStatus;
  posterName: string;
  details: string;
  contact?: string | null;
  date?: string | null;
  run?: string | null;
  route?: string | null;
  startTime?: string | null;
  clearTime?: string | null;
  swingStart?: string | null;
  swingEnd?: string | null;
  fromDay?: string | null;
  fromDate?: string | null;
  toDay?: string | null;
  toDate?: string | null;
  vacationHave?: string | null;
  vacationWant?: string | null;
  createdAt: string;
  updatedAt: string;
  reputation?: RepScore;
  saved?: boolean;
  posterLastActive?: string | null;
  posterVerified?: boolean;
}

export interface RepScore {
  score: number;
  label: string;
  color: string;
  stars: number;
  reliability: number;
  total: number;
}

export type UserRole = "member" | "contributor" | "editor" | "divisionAdmin" | "localAdmin" | "superAdmin";
export type AgreementStatus = "pending" | "userA_confirmed" | "completed" | "cancelled";

export type RegistrationStatus = "pending" | "approved" | "reassigned" | "rejected";

export interface RegistrationApprovalSummary {
  status: RegistrationStatus;
  declaredDivision?: { code: string; name: string } | null;
  declaredSubUnit?: { code: string; name: string } | null;
  rejectionReason?: string | null;
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  divisionId?: string | null;
  division?: Division | null;
  role: UserRole;
  language: string;
  avatarUrl?: string | null;
  flexibleMode: boolean;
  termsVersion?: string | null;
  reputation?: RepScore;
  jobTitle?: string | null;
  divisionSetAt?: string | null;
  verifiedMember?: boolean;
  registrationApproval?: RegistrationApprovalSummary | null;
}

export interface Announcement {
  id: string;
  divisionId: string;
  authorId: string;
  body: string;
  pinned: boolean;
  expiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
  author?: { id: string; firstName: string; lastName: string };
}

export interface FlexibleOperator {
  id: string;
  firstName: string;
  lastName: string;
  divisionId: string;
  flexibleSince: string;
  reputation?: RepScore;
}

export interface SwapAgreement {
  id: string;
  swapId: string;
  userAId: string;
  userBId: string;
  status: AgreementStatus;
  userANote?: string | null;
  userBNote?: string | null;
  userAAt?: string | null;
  userBAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  swap?: Pick<Swap, "id" | "details" | "category" | "posterName">;
  userA?: Pick<User, "id" | "firstName" | "lastName">;
  userB?: Pick<User, "id" | "firstName" | "lastName">;
}

export interface Message {
  id: string;
  swapId: string;
  fromUserId: string;
  toUserId: string;
  text: string;
  read: boolean;
  createdAt: string;
  fromUser?: { id: string; firstName: string; lastName: string };
  swap?: { id: string; details: string; category: string };
}

export type NewsStatus = "draft" | "inReview" | "published" | "archived";

export interface News {
  id: string;
  title: string;
  body: string;
  status: NewsStatus;
  divisionId: string | null;
  authorId: string;
  reviewerId: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  division?: { id: string; code: string; name: string } | null;
  author?: { id: string; firstName: string; lastName: string };
  reviewer?: { id: string; firstName: string; lastName: string } | null;
}
