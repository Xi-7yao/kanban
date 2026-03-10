# Phase 3：WebSocket 实时协作 — 完整执行流文档

---

## 一、组件树与 Provider 层级

```
QueryClientProvider          ← React Query 缓存管理
  └─ AuthProvider            ← 登录状态 + logout()
       └─ ToastProvider      ← 全局 Toast 通知
            └─ LockProvider          ← useOperationLock() 管理锁状态 Set
                 └─ SocketProvider   ← useSocket() 建立 WebSocket 连接 + emitLockAcquire/Release
                      └─ AppContent  ← 根据 isAuthenticated 渲染 KanbanBoard 或 AuthPage
```

> 来源：`kanban-app/src/App.tsx`

---

## 二、WebSocket 连接建立流程（4 步）

1. **`SocketProvider` 挂载** → 调用 `useSocket()`（`kanban-app/src/hooks/useSocket.ts`）
2. **`useSocket` 内 `useEffect` 执行** → `io('http://localhost:3000/board', { withCredentials: true })` 建立 Socket.IO 连接，`withCredentials: true` 使浏览器在 HTTP 握手时携带 `access_token` Cookie
3. **服务端 `EventsGateway.handleConnection(client)`**（`kanban-server/src/events/events.gateway.ts:28`）：
   - 从 `client.handshake.headers.cookie` 提取 `access_token`
   - `jwtService.verify(token, { secret })` 验证 JWT
   - `client.data.userId = payload.sub`
   - `client.join('board:${payload.sub}')` — 加入用户专属房间
4. **前端 `socket.on('connect')`** → 打印 `[WebSocket] 握手成功, socketId = xxx`

---

## 三、编辑锁——发送端流程（TaskCard 点击编辑）

> 涉及文件：`TaskCard.tsx` → `SocketContext.tsx` → `events.gateway.ts` → `useSocket.ts` → `LockContext.tsx`

### 加锁流程

```
用户点击 TaskCard
  → enterEditMode()                                          // TaskCard.tsx:29
    → setEditMode(true)
    → emitLockAcquire(task.id)                               // SocketContext.tsx:17
      → socketRef.current.emit('lock:acquire', cardId)       // 发送到服务端
        ↓
服务端 handleLockAcquire(client, cardId)                      // events.gateway.ts:81
  → userLocks.set(client.id, cardId)                          // 记录该 socket 持有的锁
  → broadcastToBoard(userId, 'board:event',
      { type: 'user:editing', cardId }, client.id)            // 广播给同用户其他标签页（排除自己）
        ↓
其他标签页 socket.on('board:event')                             // useSocket.ts:25
  → case 'user:editing'
    → lockRef.current.acquire('task-${event.cardId}')         // useSocket.ts:39
      → pendingOps.current.add(key)                           // useOperationLock.ts:8，往 Set 中加入 key
        ↓
其他标签页 TaskCard 渲染时
  → isLocked('task-${task.id}') 返回 true                     // TaskCard.tsx:27
  → 渲染半透明 + Lock 图标                                      // TaskCard.tsx:63-72
```

### 解锁流程

```
用户离开编辑（onBlur / Enter）
  → exitEditMode()                                           // TaskCard.tsx:34
    → setEditMode(false)
    → emitLockRelease(task.id)                               // SocketContext.tsx:23
      → socketRef.current.emit('lock:release', cardId)
        ↓
服务端 handleLockRelease(client, cardId)                      // events.gateway.ts:91
  → userLocks.delete(client.id)
  → broadcastToBoard(userId, 'board:event',
      { type: 'user:stopEditing', cardId }, client.id)
        ↓
其他标签页 socket.on('board:event')
  → case 'user:stopEditing'
    → lockRef.current.release('task-${event.cardId}')        // useSocket.ts:43
      → pendingOps.current.delete(key)                       // useOperationLock.ts:13，从 Set 中移除 key
        ↓
其他标签页 TaskCard → isLocked() 返回 false → 恢复正常渲染
```

---

## 四、编辑锁——TaskDetailModal 流程

> 涉及文件：`TaskDetailModal.tsx:17-22`

```
Modal 挂载
  → useEffect(() => {
      emitLockAcquire(task.id);            // 打开 Modal 即锁定
      return () => {
        emitLockRelease(task.id);          // 关闭 Modal 自动释放
      };
    }, [task.id, emitLockAcquire, emitLockRelease]);
```

- **打开 Modal** → `emitLockAcquire(task.id)` → 与 TaskCard 走相同的服务端广播链路
- **关闭 Modal**（点击取消/保存/背景遮罩）→ 组件卸载 → `useEffect cleanup` → `emitLockRelease(task.id)`
- **切换任务**（从 task A 切到 task B）→ `task.id` 变化 → 先 cleanup 释放 A，再 setup 锁定 B

---

## 五、断线自动释放

> 涉及文件：`events.gateway.ts:58-68`

```
客户端断线（关闭标签页 / 网络断开）
  → 服务端 handleDisconnect(client)
    → const lockedCardId = userLocks.get(client.id)
    → 如有锁：broadcastToBoard(userId, 'board:event',
        { type: 'user:stopEditing', cardId: lockedCardId }, client.id)
    → userLocks.delete(client.id)
```

防止死锁场景：用户在编辑状态下直接关闭浏览器，其他标签页仍能收到解锁通知。

---

## 六、数据同步流程（CRUD 事件）

### 完整链路

```
用户操作（创建/编辑/删除卡片或列）
  → HTTP API（POST/PATCH/DELETE）
    → Controller → Service 层执行数据库操作（Prisma）
      → this.eventsGateway.broadcastToBoard(userId, 'board:event', { type: 'card:created', ... })
        ↓
EventsGateway.broadcastToBoard()
  → this.server.to('board:${userId}').emit('board:event', data)    // 广播给房间内所有 socket
        ↓
前端 useSocket 的 socket.on('board:event') 命中 CRUD 分支        // useSocket.ts:28-35
  → queryClient.invalidateQueries({ queryKey: boardKeys.columns() })
    → React Query 自动 refetch GET /columns
      → UI 更新（所有标签页同步）
```

### 事件类型清单

| 事件 type | 触发时机 | 来源 Service |
|-----------|----------|-------------|
| `card:created` | 创建卡片后 | `CardsService.create()` |
| `card:updated` | 编辑卡片（同列）后 | `CardsService.update()` |
| `card:moved` | 卡片跨列移动后 | `CardsService.update()` |
| `card:deleted` | 删除卡片前 | `CardsService.remove()` |
| `column:created` | 创建列后 | `ColumnsService.create()` |
| `column:updated` | 编辑列后 | `ColumnsService.update()` |
| `column:deleted` | 删除列前 | `ColumnsService.remove()` |
| `user:editing` | 前端 `lock:acquire` | `EventsGateway.handleLockAcquire()` |
| `user:stopEditing` | 前端 `lock:release` 或断线 | `EventsGateway.handleLockRelease()` / `handleDisconnect()` |

> 类型定义见 `kanban-server/src/events/board-event.types.ts`

---

## 七、涉及文件清单

| 文件 | 角色 |
|------|------|
| `kanban-server/src/events/events.gateway.ts` | 服务端 WebSocket 网关：连接鉴权、房间管理、锁处理、广播方法 |
| `kanban-server/src/events/board-event.types.ts` | `BoardEvent` 联合类型定义（9 种事件） |
| `kanban-server/src/events/events.module.ts` | `@Global()` 模块，导出 `EventsGateway` 供全局注入 |
| `kanban-server/src/cards/cards.service.ts` | 注入 Gateway，在 create/update/remove 后广播 CRUD 事件 |
| `kanban-server/src/columns/columns.service.ts` | 注入 Gateway，在 create/update/remove 后广播 CRUD 事件 |
| `kanban-app/src/hooks/useSocket.ts` | 前端 socket 连接 + `board:event` 事件监听 + 分发 |
| `kanban-app/src/hooks/useOperationLock.ts` | 锁状态管理（`useRef<Set<string>>` 数据结构） |
| `kanban-app/src/contexts/SocketContext.tsx` | `SocketProvider` + `emitLockAcquire` / `emitLockRelease` 辅助函数 |
| `kanban-app/src/contexts/LockContext.tsx` | `LockProvider`，将 `useOperationLock` 实例共享给组件树 |
| `kanban-app/src/components/TaskCard.tsx` | 卡片进入/退出编辑时发送 `lock:acquire` / `lock:release` |
| `kanban-app/src/components/TaskDetailModal.tsx` | Modal 挂载/卸载时发送 `lock:acquire` / `lock:release` |
| `kanban-app/src/App.tsx` | Provider 嵌套层级定义 |
