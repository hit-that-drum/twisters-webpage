export interface MemberListRow {
  id: number;
  name: string;
  email: string | null;
  profileImage: string | null;
  isAdmin: boolean | number;
  phone: string | null;
  department: string | null;
  joinedAt: string | null;
  birthDate: string | null;
}

export interface Member {
  id: number;
  name: string;
  email: string | null;
  profileImage: string | null;
  isAdmin: boolean;
  phone: string | null;
  department: string | null;
  joinedAt: string | null;
  birthDate: string | null;
}

export interface MemberLookupRow {
  id: number;
}

export interface MemberNameRow {
  id: number;
  name: string;
}

export interface SettlementDuesRow {
  item: string;
  year: number | string;
}

export type MemberDuesStatus = {
  memberId: number;
  name: string;
} & Record<`deposit${number}`, boolean>;

export type MemberMeetingAttendanceStatus = {
  memberId: number;
  name: string;
} & Record<`attendance${number}_${number}`, boolean>;

export interface MemberMeetingAttendanceOverrideDTO {
  attended?: unknown;
}

export interface MemberMutationDTO {
  name?: unknown;
  email?: unknown;
  isAdmin?: unknown;
  phone?: unknown;
  department?: unknown;
  joinedAt?: unknown;
  birthDate?: unknown;
}

export interface MemberMutationPayload {
  name: string;
  email: string | null;
  isAdmin: boolean;
  phone: string | null;
  department: string | null;
  joinedAt: string | null;
  birthDate: string | null;
}
