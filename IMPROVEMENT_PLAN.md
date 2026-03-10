# Kanban 项目大厂面试改进计划（修订版）

## Context

当前 Kanban 项目（React 19 + NestJS + Prisma + SQLite）有基本 CRUD 和拖拽功能。本计划围绕四大方向展开：
1. **前端性能与状态管理** — React Query + 状态正规化 + 精准渲染 + UI 锁
2. **实时协作** — WebSocket 广播 + 房间管理
3. **操作溯源** — Audit Log 拦截器
4. **安全加固** — HttpOnly Cookie + CSRF Token

加上基础工程化（测试、CI/CD、Docker、README）。

---

## Phase 0: 基础工程化（前置条件）

### 0.1 Error Boundary
- 新建 `kanban-app/src/components/ErrorBoundary.tsx`
- 在 `App.tsx` 中包裹根组件

### 0.2 前端环境变量
- `kanban-app/src/api.ts` — `baseURL` 改用 `import.meta.env.VITE_API_URL`
- 新建 `kanban-app/.env.development`

### 0.3 后端基础安全
- `kanban-server/src/main.ts` — 添加 `helmet`
- `kanban-server/src/app.module.ts` — 添加 `@nestjs/throttler`
- `kanban-server/src/prisma/prisma.service.ts` — 修复硬编码 DB 路径，改用 ConfigService
- 新建 `kanban-server/.env.example`

### 0.4 修复 E2E 断言
- `kanban-server/test/app.e2e-spec.ts` — 改为 `"Kanban API is running!"`

---

## Phase 1: React Query 迁移 + 状态正规化 + 精准渲染

### 1.1 安装依赖
```bash
cd kanban-app && npm install @tanstack/react-query
```

### 1.2 正规化数据结构

核心类型（`kanban-app/src/queries/useBoardQuery.ts`）:
```typescript
interface BoardData {
  columns: Column[];                           // 有序列列表
  taskMap: Record<Id, Task>;                   // O(1) 任务查找
  columnTaskIds: Record<Id, Id[]>;             // 每列有序任务 ID
}
```

`useBoardQuery` 调用 `kanbanApi.getBoard()` 后将嵌套数据转为扁平化结构。

### 1.3 Query Key 工厂
新建 `kanban-app/src/queries/queryKeys.ts`:
```typescript
export const boardKeys = {
  all: ['board'] as const,
  columns: () => [...boardKeys.all, 'columns'] as const,
  taskSearch: (q: string) => [...boardKeys.all, 'search', q] as const,
};
```

### 1.4 Mutation Hooks（解决竞态）

**`kanban-app/src/queries/mutations/useColumnMutations.ts`**:
- `useCreateColumn` — 等服务端返回 ID，无乐观更新
- `useDeleteColumn` — `onMutate` 从 `queryClient.getQueryData()` 读快照（非闭包），乐观删除，`onError` 用快照回滚
- `useUpdateColumn` — 乐观更新标题

**`kanban-app/src/queries/mutations/useTaskMutations.ts`**:
- `useCreateTask` — 等服务端 ID
- `useDeleteTask` — 乐观删除 + 回滚
- `useUpdateTask` — 乐观更新 + 回滚
- `useMoveTask` — 不需要 `onMutate`（dnd-kit 本地状态已处理），仅 `onError` 做 `invalidateQueries`

**为什么这解决了竞态**: 当前 `useBoard.ts:48` 用 `const prevTasks = tasks` 闭包捕获回滚快照。快速连续操作时，后一个闭包捕获了前一个操作的乐观结果。React Query 的 `onMutate` 通过 `queryClient.getQueryData()` 读取**始终是最新已提交状态**的 cache，消除了闭包陷阱。

### 1.5 列级数据选择器（消除 .filter() 问题）

新建 `kanban-app/src/queries/useColumnTasks.ts`:
```typescript
export function useColumnTasks(taskMap: Record<Id, Task>, columnTaskIds: Id[]): Task[] {
  return useMemo(
    () => columnTaskIds.map(id => taskMap[id]).filter(Boolean),
    [taskMap, columnTaskIds]
  );
}
```

当前 `KanbanBoard.tsx:85` 的 `tasks.filter(t => t.columnId === col.id)` 每次渲染创建新数组引用，所有列都重渲染。改为从 `columnTaskIds[col.id]` 映射后，只有**数据真正变化的列**才触发更新。

### 1.6 React.memo 策略

**`ColumnContainer.tsx`** — `memo` + 自定义比较器:
```typescript
const ColumnContainer = memo(function ColumnContainer(props: Props) { ... },
  (prev, next) => {
    if (prev.column.title !== next.column.title) return false;
    if (prev.tasks.length !== next.tasks.length) return false;
    return prev.tasks.every((t, i) =>
      t.id === next.tasks[i].id && t.title === next.tasks[i].title
      && t.columnId === next.tasks[i].columnId);
  }
);
```

**`TaskCard.tsx`** — `memo` + 自定义比较器:
```typescript
const TaskCard = memo(function TaskCard(props: Props) { ... },
  (prev, next) => prev.task.id === next.task.id
    && prev.task.title === next.task.title
    && prev.task.content === next.task.content
);
```

### 1.7 重写 useDragAndDrop（正规化结构 + 本地覆盖层）

`kanban-app/src/hooks/useDragAndDrop.ts` — 接收 `BoardData`，维护 `dragOverrides` 状态:

```
React Query Cache (BoardData)  ← 服务端真实状态
        ↓ 合并
dragOverrides (local state)    ← 拖拽中的临时位置变更
        ↓
组件读取的最终数据
```

- `onDragOver` 跨列时：只修改源列和目标列的 `columnTaskIds`，其他列引用不变
- `onDragEnd`：清除 `dragOverrides`，触发 `useMoveTask.mutate()`
- **效果**: 拖卡片 A→B 列 → 只有 A 和 B 列重渲染，其他列静默

### 1.8 UI 锁机制（Mutex 思想）

新建 `kanban-app/src/hooks/useOperationLock.ts`:
```typescript
export function useOperationLock() {
  const pendingOps = useRef<Set<string>>(new Set());

  const acquire = useCallback((key: string): boolean => {
    if (pendingOps.current.has(key)) return false; // 已锁定
    pendingOps.current.add(key);
    return true;
  }, []);

  const release = useCallback((key: string) => {
    pendingOps.current.delete(key);
  }, []);

  const isLocked = useCallback((key: string) =>
    pendingOps.current.has(key), []);

  return { acquire, release, isLocked };
}
```

**使用场景**:
- 卡片正在被拖拽时，锁定该卡片的编辑/删除操作
- 列正在删除时，锁定该列内所有卡片操作
- 网络请求进行中时，防止同一资源的重复操作
- 与 WebSocket 协同：远端用户正在编辑的卡片显示锁定状态

在 `KanbanBoard` 中通过 Context 暴露锁状态，`TaskCard` 据此禁用交互或显示"正在编辑"指示。

### 1.9 集成到 App
- `kanban-app/src/App.tsx` — 添加 `QueryClientProvider`
- 删除旧的 `kanban-app/src/hooks/useBoard.ts`

---

## Phase 2: HttpOnly Cookie + CSRF Token（安全闭环）

### 2.1 后端改造

**`kanban-server/src/auth/auth.controller.ts`** — 登录/注册后设置 Cookie:
```typescript
@Post('login')
async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
  const result = await this.authService.login(dto.email, dto.password);

  // JWT 放入 HttpOnly Cookie，JS 无法读取
  res.cookie('access_token', result.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000, // 1 day
    path: '/',
  });

  // CSRF Token 放入普通 Cookie，前端 JS 可读取
  const csrfToken = crypto.randomUUID();
  res.cookie('csrf_token', csrfToken, {
    httpOnly: false,  // 前端需要读取
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000,
    path: '/',
  });

  return { message: 'Login successful' };
}

@Post('logout')
async logout(@Res({ passthrough: true }) res: Response) {
  res.clearCookie('access_token');
  res.clearCookie('csrf_token');
  return { message: 'Logged out' };
}
```

**`kanban-server/src/auth/jwt.strategy.ts`** — 从 Cookie 提取 JWT:
```typescript
// 改: ExtractJwt.fromAuthHeaderAsBearerToken()
// 为: 自定义 extractor 从 cookie 读取
super({
  jwtFromRequest: (req) => req?.cookies?.['access_token'] || null,
  ignoreExpiration: false,
  secretOrKey: configService.getOrThrow('JWT_SECRET'),
});
```

**新建 `kanban-server/src/common/guards/csrf.guard.ts`**:
```typescript
@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    // GET/HEAD/OPTIONS 不需要 CSRF 校验
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return true;

    const cookieToken = request.cookies?.['csrf_token'];
    const headerToken = request.headers['x-csrf-token'];

    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
      throw new ForbiddenException('CSRF token mismatch');
    }
    return true;
  }
}
```

**`kanban-server/src/main.ts`** — 启用 cookie-parser:
```typescript
import * as cookieParser from 'cookie-parser';
app.use(cookieParser());
```

安装依赖: `cookie-parser`, `@types/cookie-parser`

**`kanban-server/src/app.module.ts`** — 注册全局 CSRF Guard:
```typescript
providers: [
  { provide: APP_GUARD, useClass: CsrfGuard },
]
```

### 2.2 前端改造

**`kanban-app/src/api.ts`** — 移除 localStorage JWT，改用 Cookie:
```typescript
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // 关键：让 axios 携带 Cookie
});

// 移除旧的 request interceptor（不再需要手动附加 Authorization header）
// 新增：每次请求从 cookie 读取 CSRF Token 并放入 header
apiClient.interceptors.request.use((config) => {
  const csrfToken = document.cookie
    .split('; ')
    .find(row => row.startsWith('csrf_token='))
    ?.split('=')[1];
  if (csrfToken) {
    config.headers['X-CSRF-Token'] = csrfToken;
  }
  return config;
});
```

**`kanban-app/src/contexts/AuthContext.tsx`**:
- 移除 `localStorage.getItem('access_token')` 检查
- 改为调用 `GET /auth/me` 端点验证登录状态（返回 200 = 已登录）
- logout 调用 `POST /auth/logout` 让服务端清除 Cookie

**后端新增端点** `GET /auth/me`:
```typescript
@Get('me')
@UseGuards(AuthGuard('jwt'))
async me(@GetUser() user: JwtPayload) {
  return { userId: user.userId, email: user.email };
}
```

### 2.3 CORS 调整
`kanban-server/src/main.ts` — CORS 必须允许 credentials:
```typescript
app.enableCors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173'],
  credentials: true,  // 已有，确认保留
});
```

---

## Phase 3: WebSocket 实时协作

### 3.1 后端 WebSocket Gateway

安装依赖:
```bash
cd kanban-server && npm install @nestjs/websockets @nestjs/platform-socket.io socket.io
```

**新建 `kanban-server/src/events/events.module.ts`**
**新建 `kanban-server/src/events/events.gateway.ts`**:

```typescript
@WebSocketGateway({
  cors: { origin: ['http://localhost:5173'], credentials: true },
  namespace: '/board',
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  // 用户连接时验证 JWT（从 cookie 或 handshake query）并加入对应房间
  async handleConnection(client: Socket) {
    const token = client.handshake.auth?.token
      || client.handshake.headers?.cookie; // 从 cookie 解析
    // 验证 JWT，提取 userId
    // client.join(`board:${userId}`);  // 每个用户的看板是一个房间
  }

  handleDisconnect(client: Socket) {
    // 清理锁定状态，广播用户离线
  }

  // 服务端主动广播方法（被 Service 层调用）
  broadcastToBoard(userId: number, event: string, data: any) {
    this.server.to(`board:${userId}`).except(/* 发起者 */).emit(event, data);
  }
}
```

### 3.2 事件类型设计

```typescript
// 服务端 → 客户端的广播事件
type BoardEvent =
  | { type: 'card:created'; card: Card }
  | { type: 'card:updated'; cardId: number; changes: Partial<Card> }
  | { type: 'card:deleted'; cardId: number }
  | { type: 'card:moved'; cardId: number; fromColumnId: number; toColumnId: number; order: number }
  | { type: 'column:created'; column: Column }
  | { type: 'column:updated'; columnId: number; title: string }
  | { type: 'column:deleted'; columnId: number }
  | { type: 'user:editing'; cardId: number; userId: number }     // UI 锁
  | { type: 'user:stopEditing'; cardId: number; userId: number } // 解锁
```

### 3.3 Service 层集成

在 `CardsService` 和 `ColumnsService` 中注入 `EventsGateway`，每次写操作成功后调用 `broadcastToBoard`:

```typescript
// cards.service.ts
async create(userId: number, dto: CreateCardDto) {
  const card = await this.prisma.card.create({ ... });
  this.eventsGateway.broadcastToBoard(userId, 'board:event', {
    type: 'card:created', card
  });
  return card;
}
```

### 3.4 前端 WebSocket 集成

安装依赖:
```bash
cd kanban-app && npm install socket.io-client
```

**新建 `kanban-app/src/hooks/useSocket.ts`**:
```typescript
export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const socket = io('/board', { withCredentials: true });

    socket.on('board:event', (event: BoardEvent) => {
      // 根据事件类型更新 React Query cache
      queryClient.setQueryData<BoardData>(boardKeys.columns(), (old) => {
        if (!old) return old;
        switch (event.type) {
          case 'card:created': // 插入 taskMap + columnTaskIds
          case 'card:deleted': // 从 taskMap + columnTaskIds 移除
          case 'card:moved':   // 更新 columnTaskIds
          case 'user:editing': // 更新锁定状态
          // ...
        }
      });
    });

    socketRef.current = socket;
    return () => { socket.disconnect(); };
  }, [queryClient]);

  return socketRef;
}
```

### 3.5 UI 锁与 WebSocket 联动

在 `useSocket` 中监听 `user:editing` 事件，更新 `useOperationLock` 状态。当远端用户正在编辑卡片时：
- 该卡片显示"🔒 用户 A 正在编辑"标识
- 禁用本地编辑/删除操作
- 用户离线时自动释放锁（`handleDisconnect`）

### 3.6 关键文件清单

| 文件 | 操作 |
|------|------|
| `kanban-server/src/events/events.module.ts` | 新建 |
| `kanban-server/src/events/events.gateway.ts` | 新建 |
| `kanban-server/src/events/board-event.types.ts` | 新建 |
| `kanban-server/src/cards/cards.service.ts` | 修改 — 注入 Gateway，写操作后广播 |
| `kanban-server/src/columns/columns.service.ts` | 修改 — 同上 |
| `kanban-server/src/app.module.ts` | 修改 — 导入 EventsModule |
| `kanban-app/src/hooks/useSocket.ts` | 新建 |
| `kanban-app/src/hooks/useOperationLock.ts` | 新建 |
| `kanban-app/src/components/TaskCard.tsx` | 修改 — 显示锁定状态 |

---

## Phase 4: 操作溯源 (Audit Log)

### 4.1 数据库 Schema 变更

在 `prisma/schema.prisma` 新增:
```prisma
model AuditLog {
  id        Int      @id @default(autoincrement())
  userId    Int
  action    String   // 'card:created' | 'card:moved' | 'card:deleted' | ...
  entity    String   // 'card' | 'column'
  entityId  Int
  details   String?  // JSON: { from: 'Todo', to: 'Done' }
  createdAt DateTime @default(now())

  user      User     @relation(fields: [userId], references: [id])
}
```

运行 `npx prisma migrate dev --name add-audit-log`

### 4.2 NestJS 拦截器实现

**新建 `kanban-server/src/common/interceptors/audit-log.interceptor.ts`**:
```typescript
@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(private prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.userId;
    const method = request.method;
    const path = request.route?.path;

    return next.handle().pipe(
      tap(async (responseData) => {
        // 仅记录写操作（POST/PUT/DELETE）
        if (['POST', 'PUT', 'DELETE'].includes(method) && userId) {
          const action = this.resolveAction(method, path);
          await this.prisma.auditLog.create({
            data: {
              userId,
              action,
              entity: this.resolveEntity(path),
              entityId: responseData?.id || parseInt(request.params?.id) || 0,
              details: JSON.stringify(this.buildDetails(method, request.body, responseData)),
            },
          });
        }
      }),
    );
  }

  private resolveAction(method: string, path: string): string {
    const entity = path.includes('cards') ? 'card' : 'column';
    const verb = { POST: 'created', PUT: 'updated', DELETE: 'deleted' }[method];
    return `${entity}:${verb}`;
  }
}
```

### 4.3 注册拦截器

选项 A: 全局注册（推荐）:
```typescript
// app.module.ts
providers: [
  { provide: APP_INTERCEPTOR, useClass: AuditLogInterceptor },
]
```

选项 B: 按 Controller 注册（更细粒度）:
```typescript
@UseInterceptors(AuditLogInterceptor)
@Controller('cards')
export class CardsController { ... }
```

### 4.4 查询端点

**新建 `kanban-server/src/audit/audit.controller.ts`**:
```typescript
@Get('audit-logs')
@UseGuards(AuthGuard('jwt'))
async getLogs(
  @GetUser() user: JwtPayload,
  @Query('limit') limit = 50,
  @Query('offset') offset = 0,
) {
  return this.prisma.auditLog.findMany({
    where: { userId: user.userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  });
}
```

### 4.5 前端展示（可选加分项）

在 KanbanBoard 添加"操作历史"侧边栏：
- 显示最近操作记录
- 格式: "你 在 10:30 将 '修复 Bug' 从 Todo 移至 Done"

---

## Phase 5: 测试

### 5.1 前端测试
安装: `vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom`

| 测试文件 | 内容 |
|----------|------|
| `queries/__tests__/useBoardQuery.test.ts` | 正规化逻辑 |
| `queries/__tests__/useTaskMutations.test.ts` | 乐观更新 + 竞态回滚 |
| `hooks/__tests__/useOperationLock.test.ts` | 锁获取/释放/重入 |
| `components/__tests__/TaskCard.test.tsx` | 编辑、删除、锁定状态 |

### 5.2 后端测试
| 测试文件 | 内容 |
|----------|------|
| `auth/auth.service.spec.ts` | 登录/注册/Cookie 设置 |
| `cards/cards.service.spec.ts` | CRUD + 所有权 + 审计日志 |
| `common/guards/csrf.guard.spec.ts` | CSRF Token 校验 |
| `events/events.gateway.spec.ts` | WebSocket 连接/房间/广播 |
| `test/app.e2e-spec.ts` | 修复断言 |

---

## Phase 6: DevOps + 文档

### 6.1 README
根目录 `README.md`: 项目简介、技术栈、架构图(Mermaid)、Quick Start、截图、API 文档链接

### 6.2 CI/CD
`.github/workflows/ci.yml`: 前后端分别 lint → build → test

### 6.3 Docker
- `kanban-server/Dockerfile` — 多阶段构建
- `kanban-app/Dockerfile` — 多阶段 + Nginx
- `kanban-app/nginx.conf` — SPA 路由 + WebSocket 代理
- `docker-compose.yml` — 一键启动

---

## 实施顺序

```
Phase 0 (基础, 0.5天)
  ├─ Error Boundary
  ├─ 环境变量 (前后端)
  ├─ helmet + throttler
  └─ 修复 E2E 断言
          ↓
Phase 1 (React Query + 正规化 + 精准渲染, 2天)
  ├─ 安装 @tanstack/react-query
  ├─ queryKeys + useBoardQuery (正规化)
  ├─ mutation hooks (乐观更新)
  ├─ useColumnTasks 选择器
  ├─ ColumnContainer + TaskCard 添加 React.memo
  ├─ 重写 useDragAndDrop (正规化 + dragOverrides)
  ├─ useOperationLock (UI 锁)
  ├─ App.tsx 添加 Provider
  └─ 删除旧 useBoard.ts
          ↓
Phase 2 (HttpOnly Cookie + CSRF, 1天)
  ├─ 后端: cookie-parser + 登录设 Cookie + CSRF Guard
  ├─ 后端: jwt.strategy 从 Cookie 读 Token
  ├─ 后端: 新增 GET /auth/me + POST /auth/logout
  ├─ 前端: api.ts 改用 withCredentials + CSRF header
  └─ 前端: AuthContext 改用 /auth/me 检查登录
          ↓
Phase 3 (WebSocket 实时协作, 2天)
  ├─ 后端: EventsGateway + 房间管理 + JWT 验证
  ├─ 后端: CardsService/ColumnsService 写操作后广播
  ├─ 前端: useSocket hook 监听事件更新 cache
  ├─ 前端: UI 锁与 WebSocket 联动 (编辑锁定指示)
  └─ Nginx WebSocket 代理配置
          ↓
Phase 4 (Audit Log, 1天)
  ├─ Prisma schema 新增 AuditLog 模型 + migration
  ├─ AuditLogInterceptor (异步非阻塞)
  ├─ 审计日志查询端点
  └─ 前端操作历史侧边栏 (可选)
          ↓
Phase 5 (测试, 1.5天)
  ├─ 前端 Vitest 配置 + 核心测试
  └─ 后端 Service/Guard/Gateway 测试
          ↓
Phase 6 (DevOps + 文档, 0.5天)
  ├─ README
  ├─ CI/CD
  └─ Docker
```

**总计约 8.5 天工作量**

---

## 文件变更清单

### 新建文件 (~30个)
| 文件路径 | 用途 |
|----------|------|
| **前端 - React Query** | |
| `kanban-app/src/queries/queryKeys.ts` | Query key 工厂 |
| `kanban-app/src/queries/useBoardQuery.ts` | Board 查询 + 正规化 |
| `kanban-app/src/queries/useColumnTasks.ts` | 列级任务选择器 |
| `kanban-app/src/queries/mutations/useColumnMutations.ts` | 列 mutations |
| `kanban-app/src/queries/mutations/useTaskMutations.ts` | 任务 mutations |
| **前端 - 通用** | |
| `kanban-app/src/hooks/useOperationLock.ts` | UI 互斥锁 |
| `kanban-app/src/hooks/useSocket.ts` | WebSocket 客户端 |
| `kanban-app/src/components/ErrorBoundary.tsx` | 错误边界 |
| `kanban-app/.env.development` | 环境变量 |
| **前端 - 测试** | |
| `kanban-app/vitest.config.ts` | 测试配置 |
| `kanban-app/src/test/setup.ts` | 测试初始化 |
| `kanban-app/src/queries/__tests__/useBoardQuery.test.ts` | |
| `kanban-app/src/queries/__tests__/useTaskMutations.test.ts` | |
| `kanban-app/src/hooks/__tests__/useOperationLock.test.ts` | |
| `kanban-app/src/components/__tests__/TaskCard.test.tsx` | |
| **后端 - WebSocket** | |
| `kanban-server/src/events/events.module.ts` | WebSocket 模块 |
| `kanban-server/src/events/events.gateway.ts` | WebSocket 网关 |
| `kanban-server/src/events/board-event.types.ts` | 事件类型 |
| **后端 - 安全** | |
| `kanban-server/src/common/guards/csrf.guard.ts` | CSRF 校验 |
| **后端 - 审计** | |
| `kanban-server/src/common/interceptors/audit-log.interceptor.ts` | 审计拦截器 |
| `kanban-server/src/audit/audit.module.ts` | 审计模块 |
| `kanban-server/src/audit/audit.controller.ts` | 审计查询 |
| **后端 - 其他** | |
| `kanban-server/.env.example` | 环境变量模板 |
| `kanban-server/src/events/events.gateway.spec.ts` | Gateway 测试 |
| `kanban-server/src/common/guards/csrf.guard.spec.ts` | CSRF 测试 |
| **DevOps** | |
| `.github/workflows/ci.yml` | CI 流水线 |
| `kanban-server/Dockerfile` | 后端容器 |
| `kanban-app/Dockerfile` | 前端容器 |
| `kanban-app/nginx.conf` | Nginx 配置 |
| `docker-compose.yml` | 编排配置 |
| `README.md` | 项目文档 |

### 修改文件 (~15个)
| 文件路径 | 变更 |
|----------|------|
| `kanban-app/package.json` | +@tanstack/react-query, socket.io-client, vitest, testing-library |
| `kanban-app/src/App.tsx` | +QueryClientProvider, ErrorBoundary |
| `kanban-app/src/api.ts` | withCredentials, CSRF header, 移除 localStorage JWT |
| `kanban-app/src/contexts/AuthContext.tsx` | 改用 /auth/me 检查登录 |
| `kanban-app/src/components/KanbanBoard.tsx` | 重写: query/mutation, 正规化, WebSocket |
| `kanban-app/src/components/ColumnContainer.tsx` | +React.memo |
| `kanban-app/src/components/TaskCard.tsx` | +React.memo, 锁定状态 UI |
| `kanban-app/src/hooks/useDragAndDrop.ts` | 重写: 正规化 + dragOverrides |
| `kanban-server/package.json` | +helmet, @nestjs/throttler, cookie-parser, @nestjs/websockets, socket.io |
| `kanban-server/src/main.ts` | +helmet, cookie-parser |
| `kanban-server/src/app.module.ts` | +ThrottlerModule, CsrfGuard, EventsModule, AuditModule |
| `kanban-server/src/auth/auth.controller.ts` | Cookie 设置, /auth/me, /auth/logout |
| `kanban-server/src/auth/jwt.strategy.ts` | 从 Cookie 提取 JWT |
| `kanban-server/src/cards/cards.service.ts` | +EventsGateway 广播 |
| `kanban-server/src/columns/columns.service.ts` | +EventsGateway 广播 |
| `kanban-server/src/prisma/prisma.service.ts` | ConfigService 读 DB URL |
| `kanban-server/prisma/schema.prisma` | +AuditLog 模型, User 添加 auditLogs 关联 |
| `kanban-server/test/app.e2e-spec.ts` | 修复断言 |

### 删除文件 (1个)
| 文件路径 | 原因 |
|----------|------|
| `kanban-app/src/hooks/useBoard.ts` | 被 React Query hooks 替代 |

---

## 面试话术要点

**React Query + 竞态解决**:
> "原来用闭包捕获 prevTasks 做回滚，快速连续操作时闭包会捕获到上一个操作的乐观结果，导致回滚到错误状态。改用 React Query 后，onMutate 从 query cache 读取快照——cache 始终是最新已提交状态，彻底消除了竞态。"

**状态正规化 + 精准渲染**:
> "原来 tasks 是全局扁平数组，.filter() 每次创建新引用导致所有列重渲染。我将数据正规化为 taskMap + columnTaskIds，配合 React.memo 自定义比较器，拖拽时只有起点和终点列重渲染。"

**HttpOnly Cookie + CSRF**:
> "localStorage 存 JWT 有 XSS 风险——任何注入的脚本都能读取 token。改为 HttpOnly Cookie 后 JS 完全无法访问，配合 CSRF Token 双重校验，同时防御 XSS 和 CSRF。"

**WebSocket 实时协作**:
> "利用 NestJS 的 WebSocket Gateway 实现房间级广播。每次写操作成功后，Service 层同步向同一看板房间的其他用户推送事件，前端收到后直接更新 React Query cache，无需轮询。配合 UI 锁机制防止并发编辑冲突。"

**Audit Log**:
> "用 NestJS 拦截器以 AOP 方式异步记录每次写操作，不侵入业务代码。支持操作回溯：谁在什么时间把哪张卡片从哪里移到了哪里。"

---

## 验证方式

1. **竞态修复**: 快速连续删除 3 个任务 → 中间一个网络失败 → 其他两个正确删除，UI 一致
2. **精准渲染**: React DevTools Profiler → 拖拽卡片 → 只有 2 列高亮
3. **安全**: 浏览器 DevTools → Application → Cookies → access_token 是 HttpOnly; `document.cookie` 不含 access_token
4. **CSRF**: 用 Postman 直接发 POST 请求（不带 X-CSRF-Token header）→ 应返回 403
5. **WebSocket**: 打开两个浏览器标签登录同一账号 → 一个拖卡片 → 另一个实时更新
6. **Audit Log**: 操作后查看 `/audit-logs` 端点返回记录
7. **测试**: `cd kanban-app && npx vitest run` + `cd kanban-server && npm test`
8. **Docker**: `docker-compose up --build` 完整运行
