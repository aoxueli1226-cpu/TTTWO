# 桌面管家 V1.0.1 PRD（按当前项目结构整理）

## 目标与范围
- 目标：提供清晰的任务管理流程（创建、查看、编辑、专注、日历回顾），支持移动端固定布局与内滚动。
- 平台：Web（Next.js/React）+ Android 容器（Capacitor）
- 详细的优化目标和需求文档请查看：[优化目标文档](./Target.md)。

## 页面结构（4 个主页面）
> 入口和底部导航由应用壳负责，页面内容由各 Screen 组件渲染。

### 1) 首页（任务/概览）
**功能**
- 今日任务概览、完成统计、卡片式列表。
- 卡片点击展开/收起，列表区域内部滚动。

**交互与跳转**
- 点击任务：打开任务详情弹层。
- 点击“添加/AI”入口：进入对应的创建弹层。

**对应文件**
- 页面外壳与导航：
  - [app/layout.tsx](app/layout.tsx)
  - [app/page.tsx](app/page.tsx)
- 首页主体：
  - [components/app/HomeScreen.tsx](components/app/HomeScreen.tsx)
- 任务详情弹层：
  - [components/app/TodoDetailModal.tsx](components/app/TodoDetailModal.tsx)
- AI/手动创建：
  - [components/app/AiCreateModal.tsx](components/app/AiCreateModal.tsx)
  - [components/app/ManualCreateModal.tsx](components/app/ManualCreateModal.tsx)

---

### 2) 列表页（标签树/分组）
**功能**
- 标签树结构展示，支持展开/折叠。
- 支持拖拽排序（长按进入拖拽）。
- 节点可新建、重命名、删除。

**交互与跳转**
- 点击任务节点：打开任务详情弹层。
- 长按标签或任务节点后拖拽排序。
- 右键/更多菜单：重命名、删除、新建子标签。

**对应文件**
- 列表页主体：
  - [components/app/ListScreen.tsx](components/app/ListScreen.tsx)
- 任务详情弹层：
  - [components/app/TodoDetailModal.tsx](components/app/TodoDetailModal.tsx)

---

### 3) 专注页（番茄钟/可视化）
**功能**
- 番茄钟计时与专注统计。
- 3D 场景可视化成长状态。
- 控制按钮：开始/暂停/重置/跳过。

**交互与跳转**
- 点击时长：打开时长选择弹层。
- 点击控制按钮：影响计时与状态。

**对应文件**
- 专注页主体：
  - [components/app/FocusScreen.tsx](components/app/FocusScreen.tsx)

---

### 4) 日历页（热力图/列表视图/日详情）
**功能**
- 日历热力图视图：按日显示任务密度。
- 列表视图：按日格展示任务标签（小紫条）。
- 日详情弹层：展示当天任务列表。

**交互与跳转**
- 点击某天：显示该日的任务详情卡片。
- 列表视图点击任务条：打开任务详情弹层。
- 切换热力图/列表视图。

**对应文件**
- 日历页主体：
  - [components/app/CalendarScreen.tsx](components/app/CalendarScreen.tsx)
- 任务详情弹层：
  - [components/app/TodoDetailModal.tsx](components/app/TodoDetailModal.tsx)

---

## 悬浮球与桌面小卡片

### 悬浮球（Widget Mode）
**功能**
- 浮动球拖拽、贴边、点击展开快捷菜单。
- 快捷入口：扫描/添加事项/AI 对话等。

**交互与跳转**
- 点击悬浮球：展开快捷菜单。
- 点击菜单项：触发对应功能。

**对应文件**
- 悬浮球与小卡片视图：
  - [components/app/WidgetMode.tsx](components/app/WidgetMode.tsx)

### 桌面小卡片
**功能**
- 展示日期与当天任务清单（与应用内风格一致）。

**对应文件**
- 卡片内容与样式：
  - [components/app/WidgetMode.tsx](components/app/WidgetMode.tsx)

---

## 关键弹层与组件

### 任务详情弹层
**功能**
- 任务基本信息、时间段/提醒、标签选择、笔记富文本、流程节点。

**对应文件**
- [components/app/TodoDetailModal.tsx](components/app/TodoDetailModal.tsx)
- 标签选择器：
  - [components/app/TagSelector.tsx](components/app/TagSelector.tsx)
- 自定义日期时间选择器：
  - [components/app/AppDateTimePicker.tsx](components/app/AppDateTimePicker.tsx)

### AI 相关弹层
- AI 对话：
  - [components/app/AiChatModal.tsx](components/app/AiChatModal.tsx)
- AI 创建：
  - [components/app/AiCreateModal.tsx](components/app/AiCreateModal.tsx)

---

## 应用壳与状态管理

### 应用壳与导航
- 页面结构与底部导航：
  - [app/layout.tsx](app/layout.tsx)
  - [app/page.tsx](app/page.tsx)

### 状态与持久化
- 任务数据与状态：
  - [lib/store.ts](lib/store.ts)
- 本地持久化与安全存储：
  - [lib/persistence.ts](lib/persistence.ts)
  - [lib/secure-storage.ts](lib/secure-storage.ts)

### 全局样式与组件库
- 全局样式：
  - [app/globals.css](app/globals.css)
  - [styles/globals.css](styles/globals.css)
- UI 组件库：
  - [components/ui/*](components/ui)

---

## Android 外壳
- Android 容器与入口：
  - [android/app/src/main/AndroidManifest.xml](android/app/src/main/AndroidManifest.xml)
  - [android/app/build.gradle](android/app/build.gradle)
  - [android/build.gradle](android/build.gradle)

---

## 运行与构建
- 开发预览：npm run dev
- 打开 Android Studio：npx cap open android
