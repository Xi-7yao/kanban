export type Id = string | number;

export type Task = {
  id: Id;
  columnId: Id;
  title: string;
  content?: string;
  order: number;
  updatedAt?: string;
};

export type Column = {
  id: Id;
  title: string;
  order: number;
  cards?: Task[];
};
