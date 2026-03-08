export interface BoardRow {
  id: number;
  title: string;
  createUser: string;
  createDate: Date;
  updateUser: string;
  updateDate: Date;
  content: string;
}

export interface Board {
  id: number;
  title: string;
  createUser: string;
  createDate: Date;
  updateUser: string;
  updateDate: Date;
  content: string;
}

export interface CreateBoardDTO {
  title?: string;
  content?: string;
}

export interface UpdateBoardDTO {
  title?: string;
  content?: string;
}

export interface BoardMutationPayload {
  title: string;
  content: string;
  auditUser: string;
}
