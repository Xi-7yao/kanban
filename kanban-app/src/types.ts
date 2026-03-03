export type Id = string | number;

export type Task = {
    id: Id;
    columnId: Id;
    title: string;      // ✅ 后端的主字段
    content?: string;   // ✅ 后端的详情字段 (可选)
    order: number;      // ✅ 必须有排序字段
};

export type Column = {
    id: Id;
    title: string;
    order: number;      // 🚀 新增：列的排序字段（后端实际有返回，前端排序需要）
    cards?: Task[];     // ✅ 保持不变：后端 /columns 接口返回原始嵌套数据时包含这个 (拍平后为空)
};