export interface NoticeRow {
  id: number;
  title: string;
  createUser: string;
  createDate: Date;
  updateUser: string;
  updateDate: Date;
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
  content: string;
  pinned: boolean;
}

export interface CreateNoticeDTO {
  title?: string;
  content?: string;
  pinned?: unknown;
}

export interface UpdateNoticeDTO {
  title?: string;
  content?: string;
  pinned?: unknown;
}

export interface NoticeMutationPayload {
  title: string;
  content: string;
  pinned: boolean;
  auditUser: string;
}
