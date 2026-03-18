# TT - 系统架构文档

## 1. 整体架构图

```
┌─────────────────────────────────────────────────────┐
│               应用入口 (App.tsx)                     │
│         WidgetMode 或 AppShell 切换                 │
└────────────────────┬────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
    ┌───▼──────┐          ┌──────▼────┐
    │Normal    │          │ Widget    │
    │Shell     │          │Mode       │
    └───┬──────┘          └──────┬────┘
        │                        │
        │                    ┌───▼─────┐
        │                    │Float    │
    ┌───▼────────────────┐   │Ball +   │
    │BottomNav(4页)     │   │Quick    │
    │ ├─ Home           │   │Menu     │
    │ ├─ List           │   └─────────┘
    │ ├─ Focus          │
    │ └─ Calendar       │
    └────────────────────┘
```

---

## 2. 数据模型与存储层

### 2.1 核心数据类型 (lib/store.ts)

```typescript
// 任务项
interface TodoItem {
  id: string                    // UUID
  title: string                 // 任务标题
  description: string           // 任务描述
  completed: boolean            // 完成状态
  dueDate: Date | null          // 截止日期
  time: { hours: number, mins: number } | null  // 提醒时间
  tags: TagNode[]               // 所属标签（支持多标签）
  priority: 'high' | 'medium' | 'low'  // 优先级
  notes: string                 // 富文本笔记（Quill 格式）
  workflow: WorkflowNode[]      // 流程节点（子任务）
  createdAt: Date
  updatedAt: Date
}

// 标签树（支持最多 3 层）
interface TagNode {
  id: string
  name: string
  color: string                 // Hex 或 TailwindCSS 类名
  children: TagNode[]           // 子标签
  emoji?: string                // 可选图标
}

// 工作流/子任务
interface WorkflowNode {
  id: string
  title: string
  completed: boolean
  order: number
}

// 全局应用状态
interface AppState {
  todos: TodoItem[]
  tags: TagNode[]               // 标签树根节点
  currentTag: TagNode | null    // 当前选中标签
  pomodoro: {
    isRunning: boolean
    totalSeconds: number
    elapsedSeconds: number
    sessionsCompleted: number
  }
  widgetMode: {
    isEnabled: boolean
    position: { x: number, y: number }
    isExpanded: boolean
  }
  settings: {
    theme: 'light' | 'dark' | 'auto'
    language: 'zh' | 'en'
    soundEnabled: boolean
  }
}
```

### 2.2 存储策略

| 数据类型 | 存储方式 | Key | 说明 |
|---------|---------|-----|------|
| **任务列表** | localStorage | `todos` | JSON 序列化，最多支持 5MB |
| **标签树** | localStorage | `tags` | 支持最多 3 级嵌套 |
| **专注统计** | localStorage | `pomodoro_sessions` | 日期 + 完成数 |
| **API Key** | secure-storage | `api_keys` | 加密存储（Capacitor） |
| **Widget 位置** | localStorage | `widget_position` | {x, y} 坐标 |
| **缓存** | 内存 + sessionStorage | 临时 | 页面切换时保留 |

---

## 3. 四大主页面架构

### 3.1 首页 (HomeScreen.tsx)
```
┌─────────────────────────────┐
│   HomeScreen.tsx            │
├─────────────────────────────┤
│ Header:                     │
│  - 日期 + 今日完成数         │
│  - 快速操作 (扫描/添加)      │
├─────────────────────────────┤
│ Main Content:               │
│  - 今日任务卡片列表          │
│  - 逾期任务告警              │
│  - 即将截止提醒              │
├─────────────────────────────┤
│ Bottom Action:              │
│  - "新建任务" 按钮 → 打开    │
│    ManualCreateModal        │
│  - "快速扫描" 按钮 → 打开    │
│    ScanOverlay              │
└─────────────────────────────┘

关键交互：
- 点击任务卡片 → TodoDetailModal (编辑)
- 长按任务卡片 → 快捷菜单 (标记完成/删除/复制)
- 下拉刷新 → 重新计算今日统计

关联组件：
- TodoDetailModal (任务详情)
- ManualCreateModal (手工创建)
- ScanOverlay (条码扫描)
- DailySummaryToast (完成提示)
```

### 3.2 列表页 (ListScreen.tsx)
```
┌─────────────────────────────┐
│   ListScreen.tsx            │
├─────────────────────────────┤
│ Left Sidebar:               │
│  - TagTree (嵌套标签树)      │
│  - 支持 3 级深、彩色标记     │
│  - 可展开/折叠              │
│  - 拖拽排序（长按 220ms)     │
├─────────────────────────────┤
│ Main Content:               │
│  - 任务列表（当前标签）      │
│  - 按优先级/时间排序         │
│  - 勾选完成 / 快速操作       │
│  - 拖拽排序（长按 220ms）    │
└─────────────────────────────┘

关键交互：
- 点击标签 → 过滤该标签任务
- 长按标签/任务 (≥220ms) → isDragReady=true → 拖拽排序
- 拖拽完成 → handleDropAtPath() → store 更新
- 点击任务 → TodoDetailModal

拖拽逻辑流程：
1. onPointerDown → 启动 220ms 定时器
2. 定时器完成且用户未释放 → isDragReady=true
3. onPointerMove → 计算 drop 目标位置
4. onPointerUp → handleDropAtPath() → 数据更新

关联组件：
- TreeNodeItem (标签树节点)
- TodoDetailModal (任务详情)
- SubTaskTree (权工作流编辑)
```

### 3.3 专注页 (FocusScreen.tsx)
```
┌─────────────────────────────┐
│   FocusScreen.tsx           │
├─────────────────────────────┤
│ Top Panel (48%):            │
│  - 番茄钟显示 (mm:ss)       │
│  - 开始/暂停/重置 按钮      │
│  - 当前专注任务显示          │
├─────────────────────────────┤
│ Bottom Panel (52%):         │
│  - 3D 生长树可视化           │
│  - (Three.js 渲染)           │
│  - 目标:200min/day           │
│  - 统计: 今周 / 本月         │
└─────────────────────────────┘

关键交互：
- 点击"开始" → 启动 Timer (localStorage 保存进度)
- 页面离开时 → Timer 继续运行后台计时
- 页面返回 → 从本地恢复时间戳
- 定时器完成 → 播放提示音 + 更新 sessionCount
- 点击当前任务 → TodoDetailModal

定时器数据结构：
{
  isRunning: boolean
  totalSeconds: number (目标)
  elapsedSeconds: number (已用)
  sessionsCompleted: number
  lastStartTime: timestamp (用于后台恢复)
}

关联组件：
- 3D Canvas (Three.js 树).tsx
- 无额外弹层（内联式交互）
```

### 3.4 日历页 (CalendarScreen.tsx)
```
┌──────────────────────────────────┐
│     CalendarScreen.tsx           │
├──────────────────────────────────┤
│ Header:                          │
│  - 月份选择 (< 月份 >)           │
│  - 视图切换 (热力图 ↔ 列表)     │
├──────────────────────────────────┤
│ View A: 热力图 (默认)            │
│  - 7 列 x 6 行 (周×周)          │
│  - 单元格颜色 = 任务完成数       │
│  - 点击单元格 → 切换为列表视图   │
├──────────────────────────────────┤
│ View B: 列表视图                 │
│  - 当前月天数列表                │
│  - 每行显示: 日期 + 任务条数     │
│  - 任务条: 彩色条形图            │
│  - 小紫条: 任务标题截断(4字+...) │
│  - 点击条形 → 展开日详情卡片     │
│                                  │
│  日详情卡片结构:                 │
│  ┌─────────────────┐             │
│  │ 日期 + 天气      │             │
│  ├─────────────────┤             │
│  │ 任务1 ▶           │             │
│  │ 任务2 ✓ (完成)    │             │
│  │ 任务3             │             │
│  │ + 添加            │             │
│  └─────────────────┘             │
└──────────────────────────────────┘

关键交互：
- 点击热力图单元格 → View 切换为列表
- 列表中点击任务条 → 展开日详情卡片
- 日详情卡片中点击任务 → TodoDetailModal (编辑)
- 日详情卡片中"+ 添加" → ManualCreateModal (当日)

数据呈现逻辑：
1. 按 dueDate 分组所有 todos
2. 计算完成率 (0-100%) → 热力图颜色
3. 列表视图按日期展开，显示截断后的任务标题

关联组件：
- TodoDetailModal (任务详情)
- ManualCreateModal (新建当日任务)
- DailySummaryToast (完成统计)
```

---

## 4. 核心弹层模块

### 4.1 TodoDetailModal (任务编辑)
```
触发点:
- HomeScreen/ListScreen/Calendar: 点击任务
- 返回值: 修改后的 TodoItem (保存) 或 null (取消)

结构:
┌─────────────────────────────┐
│ Header: 任务标题输入         │
├─────────────────────────────┤
│ Tab 1: 基础信息              │
│  - 标题、描述 (TextArea)     │
│  - 优先级 (Radio)            │
│  - 截止日期 (DatePicker)    │
│  - 提醒时间 (TimePicker)    │
├─────────────────────────────┤
│ Tab 2: 标签选择              │
│  - TagSelector (多选)        │
│  - 可搜索、创建新标签         │
├─────────────────────────────┤
│ Tab 3: 流程/子任务           │
│  - SubTaskTree (可拖拽排序) │
│  - 新增/删除子任务            │
├─────────────────────────────┤
│ Tab 4: 笔记 (富文本)         │
│  - React Quill Editor        │
│  - 支持粗体/斜体/链接/代码    │
├─────────────────────────────┤
│ Tab 5: AI 助手 (可选)        │
│  - "AI 填充" 按钮 → 自动生成 │
│  - "AI 解析" 按钮 → 语音→文本 │
│  - 对话历史                  │
├─────────────────────────────┤
│ Footer:                      │
│  - [删除] [取消] [保存]       │
└─────────────────────────────┘

状态转移:
编辑中 → (修改字段) → 脏状态 → (保存) → 已同步
     ↓ (关闭) → 询问是否保存
     ↓ (AI 操作) → 等待响应 → 自动填充

关联组件:
- TagSelector (标签多选)
- SubTaskTree (工作流)
- 富文本编辑器 (Quill)
- AiChatModal (AI 对话框)
```

### 4.2 其他关键模块
| 模块 | 触发 | 作用 | 关联文件 |
|-----|------|------|---------|
| ManualCreateModal | "新建任务" 按钮 | 快速创建任务 | TodoDetailModal |
| ScanOverlay | "扫描" 按钮 | 条码识别 + 自动创建 | ManualCreateModal (可选) |
| AiCreateModal | "AI 创建" 按钮 | 语音/文本 → 任务生成 | 无弹层嵌套 |
| AiChatModal | TodoDetailModal 内的"AI 助手" | 多轮对话 + 建议 | TodoDetailModal |
| TagSelector | TodoDetailModal 内 | 多标签选择 + 创建 | 无弹层 |
| ApiKeyManager | 设置页 | API 密钥配置 | 无弹层 |

---

## 5. 数据流与状态管理

### 5.1 单向数据流
```
┌─ 用户交互 (点击/输入/拖拽)
│
├─ 事件处理 (onClick / onDragEnd / onChange)
│
├─ 更新逻辑
│  ├─ 直接状态修改 (useState)
│  └─ store 全局状态修改 (lib/store.ts reducer)
│
├─ 持久化
│  ├─ localStorage 保存 (lib/persistence.ts)
│  └─ secure-storage 加密存储 (lib/secure-storage.ts)
│
└─ 页面重渲染 (React re-render)
```

### 5.2 关键状态同步点

| 事件 | 源 | 更新路径 | 持久化 |
|-----|---|---------|---------| 
| 新建任务 | ManualCreateModal | store.addTodo() | ✅ localStorage |
| 编辑任务 | TodoDetailModal | store.updateTodo() | ✅ localStorage |
| 任务完成 | 勾选操作 | store.toggleTodo() | ✅ localStorage |
| 标签排序 | ListScreen 拖拽 | store.reorderTags() | ✅ localStorage |
| 任务排序 | ListScreen 拖拽 | store.reorderTodos() | ✅ localStorage |
| 专注时间 | Timer | store.addPomodoro() | ✅ localStorage |
| Widget 位置 | WidgetMode 拖拽 | store.setWidgetPosition() | ✅ localStorage |
| API Key | ApiKeyManager | secure-storage | ✅ encrypted |

### 5.3 localStorage 结构
```json
{
  "todos": [...TodoItem[]],
  "tags": [...TagNode[]],
  "pomodoro_sessions": [
    { "date": "2026-03-18", "count": 5, "minutes": 250 }
  ],
  "widget_position": { "x": 100, "y": 200 },
  "settings": {
    "theme": "dark",
    "language": "zh"
  }
}
```

---

## 6. 特殊交互机制

### 6.1 拖拽系统 (ListScreen + TodoDetailModal)
```
触发条件:
- 长按(≥220ms) → isDragReady = true
- 立即释放 → 取消 (防止误触)

拖拽流程:
1. onPointerDown
   ├─ 记录起始位置
   ├─ 启动 220ms 延迟定时器
   └─ 计划: 定时器完成后 isDragReady=true

2. onPointerMove (timerId 存活期间)
   ├─ 若 isDragReady 未激活 → 无效
   └─ 若 isDragReady 已激活
       ├─ 计算相对位移
       ├─ 高亮 drop 目标
       └─ 更新 hover 样式

3. onPointerUp
   ├─ 清理定时器
   ├─ isDragReady 仍为 false → 视为单击
   ├─ isDragReady 为 true → 执行 drop
   │   ├─ 调用 handleDropAtPath()
   │   ├─ 更新 store
   │   └─ localStorage 保存
   └─ isDragReady 复位

代码示例 (核心逻辑):
const [isDragReady, setIsDragReady] = useState(false);
const [dragSource, setDragSource] = useState(null);

const handlePointerDown = (e, sourceData) => {
  const timerId = setTimeout(() => {
    setIsDragReady(true); // 220ms 后激活拖拽
  }, 220);
  setDragSource({ timerId, sourceData });
};

const handlePointerUp = (e, targetData) => {
  if (!isDragReady) {
    // 单击处理
    handleClick(sourceData);
  } else {
    // 拖拽完成处理
    handleDropAtPath(sourceData, targetData);
  }
  setIsDragReady(false);
};
```

### 6.2 Pomodoro 后台计时
```
原理:
- 定时器以 localStorage 中的时间戳为基准
- 页面离开 → 存储当前时间戳
- 页面返回 → 从时间戳恢复进度

存储结构:
{
  isRunning: true,
  totalSeconds: 1500 (25分钟)
  elapsedSeconds: 300 (5分钟已用)
  lastStartTime: 1710767400000 (JS timestamp)
}

页面返回恢复逻辑:
1. 读取 lastStartTime 和 elapsedSeconds
2. 计算当前已用时间: (Date.now() - lastStartTime) / 1000
3. 更新 elapsedSeconds += deltaTime
4. 若 elapsedSeconds >= totalSeconds → 完成处理
```

### 6.3 标签过滤与视图切换
```
ListScreen 状态:
- currentTag: TagNode | null
- 若 null → 显示所有任务
- 若选中标签 → 显示该标签及子标签的所有任务

点击标签流程:
1. 用户点击标签 A
2. setCurrentTag(A)
3. 过滤: filter(todo => todo.tags 包含 A 或 A 的祖先)
4. 重新渲染列表
5. localStorage 记忆 currentTag (可选)

多标签支持:
- 一个任务可属于多个标签
- 过滤时用 OR 逻辑: todo.tags.some(tag => isDescendant(tag, currentTag))
```

---

## 7. 技术栈与关键库

| 层级 | 技术 | 用途 |
|-----|------|-----|
| **框架** | Next.js 14 + React 18 | 全栈开发 |
| **语言** | TypeScript | 类型安全 |
| **样式** | Tailwind CSS + CSS Modules | 响应式设计 |
| **UI 组件** | shadcn/ui (自定义) | 通用组件库 |
| **3D 可视化** | Three.js | Focus 页面树形图 |
| **富文本** | React Quill | 任务笔记编辑 |
| **状态** | React Hooks + localStorage | 全局状态 + 持久化 |
| **移动壳** | Capacitor | 跨平台 (Android/iOS) |
| **构建** | Gradle + Android Studio | Android APK 编译 |
| **吐司通知** | sonner | 系统提示 |

---

## 8. 页面切换与路由流程

```
Bottom Navigation (4 个标签页)

Home ←→ List ←→ Focus ←→ Calendar

切换时的状态处理:
1. 保存当前页面的滚动位置 / 输入框内容 (可选)
2. 清理定时器 / 加载状态 (如需)
3. 从 localStorage 恢复目标页面状态 (可选)
4. 渲染新页面

特殊场景:
- 若在 Focus 页启动 Pomodoro，
  切换到其他页面 → Timer 继续后台运行
- 若在 ListScreen 拖拽中切换页面 → 取消拖拽，保存结果
```

---

## 9. Widget 模式独立流程

```
WidgetMode.tsx (独立于 AppShell)

启用时:
1. 隐藏 BottomNav
2. 显示 FloatingBall
3. Widget 可独立拖拽、展开菜单

FloatingBall 交互:
┌─────────────┐
│   ⚫ 浮球    │  ← 拖拽到屏幕边缘自动贴边
└─────────────┘
      ↑ (点击展开)
      │
      ↓
┌──────────────────────┐
│ 快捷菜单:          │
│ [📷 扫描]          │
│ [➕ 新建]          │
│ [💬 AI 对话]      │
└──────────────────────┘
      ↑ (点击任一菜单项)
      │
      ├─ 扫描 → ScanOverlay
      ├─ 新建 → ManualCreateModal
      └─ AI → AiChatModal
```

---

## 10. 编译与部署流程

### 10.1 开发环境
```bash
npm install          # 安装依赖
npm run dev         # 启动 Next.js dev server (localhost:3000)
npx cap sync        # 同步 Web 资源到 Android 项目
```

### 10.2 Android 构建
```bash
npx cap open android  # 在 Android Studio 中打开项目
# (Android Studio) Build → Build APK
# 或
./gradlew assembleDebug    # 命令行构建 debug APK
./gradlew assembleRelease  # 命令行构建 release APK
```

### 10.3 APK 输出路径
```
android/app/build/outputs/apk/
├─ debug/
│  └─ app-debug.apk       ← 开发版，可直接安装
└─ release/
   └─ app-release.apk     ← 上架版，需签名
```

---

## 11. 文件树 (快速导航)

```
src/
├── app/
│   ├── layout.tsx              # 全局布局
│   └── page.tsx                # 入口组件
│
├── components/
│   ├── app/
│   │   ├── HomeScreen.tsx      ← 首页
│   │   ├── ListScreen.tsx      ← 列表 (标签树 + 任务)
│   │   ├── FocusScreen.tsx     ← 专注 (Pomodoro + 3D)
│   │   ├── CalendarScreen.tsx  ← 日历 (热力图 + 列表)
│   │   ├── TodoDetailModal.tsx ← 任务编辑弹层
│   │   ├── ManualCreateModal.tsx ← 快速新建
│   │   ├── AiCreateModal.tsx   ← AI 创建
│   │   ├── AiChatModal.tsx     ← AI 对话
│   │   ├── ScanOverlay.tsx     ← 扫描
│   │   ├── WidgetMode.tsx      ← 浮动球模式
│   │   ├── TagSelector.tsx     ← 标签选择
│   │   ├── SubTaskTree.tsx     ← 工作流编辑
│   │   └── ...其他屏幕
│   │
│   └── ui/
│       ├── button.tsx
│       ├── dialog.tsx
│       ├── card.tsx
│       └── ...shadcn 组件
│
├── lib/
│   ├── store.ts                # 全局状态 + reducer
│   ├── persistence.ts          # localStorage 操作
│   ├── secure-storage.ts       # 加密存储
│   └── utils.ts                # 工具函数
│
├── hooks/
│   ├── use-mobile.ts           # 响应式断点 hook
│   └── use-toast.ts            # 吐司通知 hook
│
└── styles/
    └── globals.css             # 全局样式
```

---

## 总结

此架构文档提供了从**系统全景 → 页面细节 → 数据流 → 交互机制 → 部署流程**的完整视图。每个部分可独立深入研究（参考 PRD.md 获取模块详情）。

**关键理解点：**
1. ✅ 四大屏幕独立但共享状态 (via store.ts + localStorage)
2. ✅ 拖拽通过 220ms 长按触发，避免误触
3. ✅ 数据持久化至 localStorage，移动端支持离线访问
4. ✅ WidgetMode 可并行运行，不影响主 AppShell
5. ✅ 所有弹层均为受控组件，父组件管理状态和触发条件
