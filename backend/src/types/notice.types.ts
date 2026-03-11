export interface NoticeRow {
  id: number;
  title: string;
  createUser: string;
  createDate: Date;
  updateUser: string;
  updateDate: Date;
  imageUrl: string | null;
  content: string;
  pinned: boolean | number;
}

export interface Notice {
  id: number;
  title: string;
  createUser: string;
  createDate: Date;
  updateUser: string;
  updateDate: Date;
  imageUrl: string | null;
  content: string;
  pinned: boolean;
}

export interface CreateNoticeDTO {
  title?: string;
  imageUrl?: unknown;
  content?: string;
  pinned?: unknown;
}

export interface UpdateNoticeDTO {
  title?: string;
  imageUrl?: unknown;
  content?: string;
  pinned?: unknown;
}

export interface NoticeMutationPayload {
  title: string;
  imageUrl: string | null;
  content: string;
  pinned: boolean;
  auditUser: string;
}
