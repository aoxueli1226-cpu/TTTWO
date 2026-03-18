"use client"

export type AppPage =
  | "loading"
  | "login"
  | "api-setup"
  | "home"
  | "lists"
  | "focus"
  | "calendar"
  | "profile"
  | "widget"

export type ApiProvider = {
  id: string
  name: string
  label: string
  type: "free" | "paid"
  desc: string
  price?: string
  steps: { title: string; url?: string; detail: string }[]
}

export type TodoItem = {
  id: string
  title: string
  time?: string
  reminderAt?: string
  timeRangeEnabled?: boolean
  timeRangeStart?: string
  timeRangeEnd?: string
  date: string // YYYY-MM-DD (Start Date)
  endDate?: string // YYYY-MM-DD (End Date, optional, if present means multi-day)
  done: boolean
  steps?: string[]
  notes?: string[]
  subTasks?: SubTaskNode[] // hierarchical subtasks
  stepsContent?: string // Rich text/markdown content for steps
  notesContent?: string // Rich text/markdown content for notes
  workflow?: WorkflowNode[]
  currentWorkflowIndex?: number
  reminder?: boolean
  tags?: string[]
}

export type WorkflowNode = {
  id: string
  label: string
  done: boolean
}

export type TagNode = {
  id: string
  name: string
  children?: TagNode[]
}

export type SubTaskNode = {
  id: string
  title: string
  done: boolean
  children?: SubTaskNode[]
}

export type User = {
  phone?: string
  nickname: string
  avatar?: string
  apiProviders: { providerId: string; key: string; current: boolean }[]
  notifications: boolean
  calendarSync: boolean
  darkMode: boolean
}

export const API_PROVIDERS: ApiProvider[] = [
  {
    id: "rskAi",
    name: "RskAi",
    label: "免费推荐",
    type: "free",
    desc: "免费 · 国内直连",
    steps: [
      { title: "访问官网注册账号", url: "https://rsk.ai", detail: "点击注册，填写基本信息" },
      { title: "进入控制台", detail: '登录后点击"API管理"' },
      { title: "创建 API Key", detail: '点击"新建密钥"，复制生成的密钥' },
      { title: "粘贴到下方输入框", detail: "将密钥粘贴到下方并保存" },
    ],
  },
  {
    id: "n1n",
    name: "n1n",
    label: "免费",
    type: "free",
    desc: "免费 · 国内直连",
    steps: [
      { title: "访问官网注册账号", url: "https://n1n.ai", detail: "注册并验证手机号" },
      { title: "进入控制台", detail: '点击顶部"API"菜单' },
      { title: "创建 API Key", detail: "生成并复制密钥" },
      { title: "粘贴到下方输入框", detail: "填入密钥后完成配置" },
    ],
  },
  {
    id: "aliyun",
    name: "阿里云百炼",
    label: "按量付费",
    type: "paid",
    desc: "¥0.0008/千 token",
    price: "¥0.0008/千 token",
    steps: [
      { title: "登录阿里云控制台", url: "https://bailian.aliyun.com", detail: "使用阿里云账号登录" },
      { title: "开通百炼服务", detail: '在服务列表找到"百炼"并开通' },
      { title: "创建 API Key", detail: '进入"API Keys"页面新建' },
      { title: "粘贴到下方输入框", detail: "复制后填入并保存" },
    ],
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    label: "按量付费",
    type: "paid",
    desc: "¥0.001/千 token",
    price: "¥0.001/千 token",
    steps: [
      { title: "访问 DeepSeek 官网", url: "https://platform.deepseek.com", detail: "注册账号并完成实名认证" },
      { title: "进入 API 管理", detail: '登录后点击"API Keys"' },
      { title: "创建 API Key", detail: '点击"创建新的 API Key"，复制' },
      { title: "粘贴到下方输入框", detail: "填入后点击完成配置" },
    ],
  },
  {
    id: "openai",
    name: "OpenAI",
    label: "按量付费",
    type: "paid",
    desc: "$0.002/千 token",
    price: "$0.002/千 token",
    steps: [
      { title: "访问 OpenAI 官网", url: "https://platform.openai.com", detail: "注册或登录账号" },
      { title: "进入 API Keys 页面", detail: '点击左侧"API Keys"' },
      { title: "创建新密钥", detail: '点击"Create new secret key"并复制' },
      { title: "粘贴到下方输入框", detail: "填入后点击完成配置" },
    ],
  },
]

export const DEMO_TODOS: TodoItem[] = [
  {
    id: "t1",
    title: "完成产品方案设计",
    time: "10:00",
    date: "2026-03-12",
    done: false,
    steps: ["收集用户需求", "绘制原型图", "撰写设计文档", "团队内部评审"],
    notes: ["与技术团队沟通需求可行性", "保持设计简洁，避免过度设计"],
    workflow: [
      { id: "w1", label: "起草", done: true },
      { id: "w2", label: "审核中", done: false },
      { id: "w3", label: "修改", done: false },
      { id: "w4", label: "完成", done: false },
    ],
    currentWorkflowIndex: 1,
    reminder: true,
  },
  {
    id: "t2",
    title: "客户需求沟通",
    time: "14:30",
    date: "2026-03-12",
    done: false,
    steps: ["准备沟通提纲", "确认会议时间", "记录客户反馈", "整理会议纪要"],
    notes: ["提前15分钟进入会议室", "携带产品演示资料"],
  },
  {
    id: "t3",
    title: "整理周报",
    time: "17:00",
    date: "2026-03-12",
    done: true,
    steps: ["汇总本周工作", "填写周报模板", "提交给主管"],
    notes: ["注意截止时间为 18:00"],
  },
  {
    id: "t4",
    title: "健身 30 分钟",
    date: "2026-03-12",
    done: false,
    steps: ["热身 5 分钟", "有氧运动 20 分钟", "拉伸放松 5 分钟"],
  },
  {
    id: "t5",
    title: "阅读技术文档",
    time: "09:00",
    date: "2026-03-13",
    done: false,
    steps: ["阅读 Next.js 新特性", "记录要点", "整理笔记"],
  },
  {
    id: "t6",
    title: "项目进度汇报",
    time: "11:00",
    date: "2026-03-13",
    done: false,
    workflow: [
      { id: "w1", label: "准备", done: true },
      { id: "w2", label: "汇报", done: false },
      { id: "w3", label: "确认", done: false },
    ],
    currentWorkflowIndex: 1,
  },
  {
    id: "t7",
    title: "代码 Review",
    time: "15:00",
    date: "2026-03-14",
    done: false,
  },
  {
    id: "t8",
    title: "设计评审会议",
    time: "10:00",
    date: "2026-03-15",
    done: false,
    workflow: [
      { id: "w1", label: "准备", done: false },
      { id: "w2", label: "评审", done: false },
      { id: "w3", label: "修改", done: false },
    ],
    currentWorkflowIndex: 0,
  },
  {
    id: "t9",
    title: "月度总结撰写",
    time: "16:00",
    date: "2026-03-16",
    done: false,
  },
  {
    id: "t10",
    title: "团队建设活动",
    date: "2026-03-18",
    done: false,
  },
  {
    id: "t11",
    title: "季度规划讨论",
    time: "14:00",
    date: "2026-03-19",
    done: false,
  },
  {
    id: "t12",
    title: "产品发布会准备",
    time: "10:00",
    date: "2026-03-20",
    done: false,
    workflow: [
      { id: "w1", label: "场地确认", done: true },
      { id: "w2", label: "PPT制作", done: true },
      { id: "w3", label: "排练", done: false },
      { id: "w4", label: "发布", done: false },
    ],
    currentWorkflowIndex: 2,
  },
]

export const DEMO_HISTORY = [
  { date: "3/12", action: '创建了"产品方案设计"任务' },
  { date: "3/12", action: '完成了"整理周报"' },
  { date: "3/12", action: "使用 AI 生成了 3 个待办" },
  { date: "3/11", action: '完成了"客户需求沟通"' },
  { date: "3/11", action: '创建了"健身 30 分钟"任务' },
  { date: "3/10", action: "使用扫描功能创建了 2 个待办" },
]
