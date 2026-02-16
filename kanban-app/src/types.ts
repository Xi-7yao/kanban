export type Id = string | number;

export type Task = {
    id: Id;
    columnId: Id;
    title: string;      // ✅ 后端的主字段是 title
    content?: string;   // ✅ 后端的详情字段 (可选)
    order: number;      // ✅ 必须有排序字段
};

export type Column = {
    id: Id;
    title: string;
    cards?: Task[];     // ✅ 后端 /board 接口返回时会包含这个
};