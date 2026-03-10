import type { Product } from "./types";

const DB: Product[] = [
    { id: 1, title: "Flexbox 课程", price: 999, color: "#3b82f6", desc: "掌握现代 CSS 布局的核心！" },
    { id: 2, title: "Grid 布局大师", price: 129, color: "#10b981", desc: "二维布局的终极解决方案。" },
    { id: 3, title: "React 零基础", price: 299, color: "#8b5cf6", desc: "从入门到精通的必修课。" },
    { id: 4, title: "TypeScript 进阶", price: 199, color: "#f59e0b", desc: "掌握类型系统的奥秘。" }, // 补上了详情描述
];

export const getProducts = async (): Promise<Product[]> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return DB;
};

export const getProductById = async (id: number): Promise<Product | undefined> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return DB.find(item => item.id === id);
};