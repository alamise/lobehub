# 全局共享 Agent 资源改造计划

## 目标

为全局共享 Agent `agt_J8tHPinLzsfP` 增加共享技能、共享插件、共享 MCP/连接器能力。
同时支持“共享 Agent 独占模式”：普通用户登录后只展示全局共享的【环保助手】，不再自动创建或展示原生 `Lobe AI` / `inbox` 默认 Agent。

原则：
- 共享资源只在共享 Agent 下生效。
- 私有 Agent 保持原逻辑不变。
- 个人安装的技能、插件、连接器继续保留“仅自己可见、仅自己可用”。
- 共享资源采用管理员显式标记，不自动推断。
- 共享 Agent 独占模式只隐藏/禁用原生 `inbox` 默认 Agent，不删除数据库历史数据。

## 管理员规则

系统支持管理员识别，优先按以下顺序判断：

1. 环境变量配置的管理员邮箱或用户 ID
2. 用户表 `users.role`
3. RBAC 全局角色 `super_admin`

本次计划中，`31330362@qq.com` 需纳入管理员名单。

建议使用环境变量维护：
- `LOBE_SYSTEM_ADMIN_EMAILS=31330362@qq.com`
- `LOBE_SYSTEM_ADMIN_USER_IDS=`（如后续需要可补充）

## 运行配置

当前环保助手共享模式建议配置：

```env
LOBE_GLOBAL_SHARED_AGENT_IDS=agt_J8tHPinLzsfP
LOBE_GLOBAL_SHARED_AGENT_ONLY=1
LOBE_SYSTEM_ADMIN_EMAILS=31330362@qq.com
```

说明：
- `LOBE_GLOBAL_SHARED_AGENT_IDS` 指定全局共享 Agent。
- `LOBE_GLOBAL_SHARED_AGENT_ONLY=1` 启用共享 Agent 独占模式，阻止新用户自动创建原生 `Lobe AI` / `inbox`，并隐藏首页 `Lobe AI` 入口。
- 兼容旧变量名 `LOBE_YUXIAOHUAN_SHARED_AGENT_ONLY=1`，但后续优先使用 `LOBE_GLOBAL_SHARED_AGENT_ONLY`。
- 该模式不影响用户手动创建私有 Agent；私有 Agent 原有创建、编辑、删除逻辑保留。

## 开发任务

| 序号 | 任务 | 目标 | 主要改动点 | 开发状态 |
|---:|---|---|---|---|
| 1 | 管理员识别 | 支持区分管理员和普通用户 | 新增系统管理员判断工具，兼容邮箱、用户 ID、DB 角色 | 已完成 |
| 2 | 共享标记规范 | 明确哪些资源属于共享资源 | 复用现有 JSON 字段记录共享标记 | 已完成 |
| 3 | 共享 Agent 资源作用域 | 共享 Agent 读取管理员资源 | 新增共享作用域解析工具 | 已完成 |
| 4 | 技能共享查询 | 共享 Agent 下加载共享技能 | 扩展技能查询与读取接口 | 已完成 |
| 5 | 插件共享查询 | 共享 Agent 下加载共享插件 | 扩展插件查询接口 | 已完成 |
| 6 | MCP/连接器共享查询 | 共享 Agent 下加载共享连接器 | 扩展连接器查询与执行接口 | 已完成 |
| 7 | 固定启用逻辑 | 共享资源自动启用 | 在聊天运行时合并共享资源 | 已完成 |
| 8 | 技能执行链路 | 共享技能可激活、可执行 | 调整 Skills/Activator 运行时 | 已完成 |
| 9 | MCP 执行链路 | 共享 MCP 可调用成功 | `connector.callTool` 支持共享 Agent 视角 | 已完成 |
| 10 | 前端加载共享资源 | 页面能看到共享资源 | 进入共享 Agent 时按共享作用域拉取资源 | 已完成 |
| 11 | 共享开关入口 | 只有管理员能设置共享 | 增加共享/取消共享入口与校验 | 已完成 |
| 12 | 取消默认 Lobe AI | 共享 Agent 独占模式下不创建、不展示 inbox | 增加 `LOBE_GLOBAL_SHARED_AGENT_ONLY` 开关，拦截 `getBuiltinAgent('inbox')`、`createInbox()` 与首页 `InboxItem` 渲染 | 已完成 |
| 13 | 测试验证 | 防止影响私有 Agent | 增加单测和集成测试 | 受阻：当前本机依赖缺少 `vitest`，测试命令无法启动 |
| 14 | 构建验证 | 确认代码可编译 | 本地执行类型检查/构建 | 受阻：当前本机依赖缺少 `tsgo`、`tsc`，暂未完成类型检查和构建 |

## 实施顺序

1. 先完成管理员识别与共享标记基础能力。
2. 再接共享 Agent 的资源读取与固定启用。
3. 然后补技能、MCP 的真实执行链路。
4. 启用共享 Agent 独占模式，取消原生 `Lobe AI` / `inbox` 默认入口。
5. 最后补前端展示和测试。

## 约束

- 不新增数据库表，优先复用现有字段。
- 不改私有 Agent 的创建、编辑、删除、启用规则。
- 共享资源只对共享 Agent 生效。
- 普通用户仍可安装自己的技能、插件、连接器。
- 不删除历史 `inbox` 数据，避免误删原生消息、任务、onboarding 等关联数据。
