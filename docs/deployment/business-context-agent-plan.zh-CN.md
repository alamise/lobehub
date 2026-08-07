# 业务上下文共享 Agent 设计方案

## 目标

在档案详情页右侧【文档问答助手】、企业详情页右侧【企业问答助手】中，复用 LobeHub 现有 Agent、MCP、会话、工具调用展示、引用来源、思考过程、调试面板、模型参数和提示词可视化配置能力。

本方案不重新开发两套独立问答后端。管理员预先创建两个共享 Agent：

- 文档问答助手
- 企业问答助手

普通用户只能使用这两个共享 Agent，不能编辑其提示词、模型、技能、MCP 工具配置。页面打开时动态传入当前业务 ID：

- 档案详情页传入 `archiveId`
- 企业详情页传入 `enterpriseId`

业务 ID 属于单次运行上下文，不写入 Agent 基础配置。MCP 工具执行时必须拿到并强制使用该业务 ID，限定只查询当前档案或当前企业的数据。

## 设计原则

- 复用 LobeHub Agent Runtime，不绕过现有会话、工具、引用、调试和追踪链路。
- 共享 Agent 的提示词、模型、技能、MCP 配置由管理员统一维护。
- 页面业务 ID 是运行态参数，不是 Agent 静态配置。
- 服务端强制注入业务 ID，不依赖模型 “自觉传参”。
- MCP 工具层缺少业务 ID 时默认失败，不回退到全局查询。
- 普通聊天 Agent、私有 Agent、已有共享 Agent 尽量不受影响。
- 新增字段必须受控校验，不允许前端传任意 JSON 到运行态。

## 总体方案

在现有 `execAgent` 的 `appContext` 中新增运行态业务上下文 `businessContext`：

```ts
businessContext: {
  kind: 'archive' | 'enterprise';
  archiveId?: string;
  enterpriseId?: string;
}
```

字段命名约定：

- LobeHub 前端、tRPC、TypeScript 运行态统一使用 camelCase：`archiveId`、`enterpriseId`
- MCP 工具入参统一使用 snake\_case：`archive_id`、`enterprise_id`
- `enterpriseId` 对应业务库 `co_polluter_enterprise.id`
- `archiveId` 由档案详情页 URL / 路由参数解析得到，作为当前档案的唯一业务 ID

推荐链路：

```mermaid
flowchart LR
  A["档案/企业详情页"] --> B["右侧问答面板"]
  B --> C["共享 Agent 会话发送消息"]
  C --> D["aiAgent.execAgent(appContext.businessContext)"]
  D --> E["AgentRuntime operation state.metadata"]
  E --> F["ServerToolTransport"]
  F --> G["ToolExecutionContext.businessContext"]
  G --> H["MCP 工具参数强制注入"]
  H --> I["hbai-mcp 查询当前档案/企业"]
  I --> J["LobeHub 工具结果、引用、过程展示"]
```

该链路复用已有运行结构：`appContext -> createOperation -> state.metadata -> ServerToolTransport -> ToolExecutionContext -> mcpService.callTool`。

## 关键改动点

### 1. 类型定义

在 `ExecAgentAppContext` 中增加 `businessContext`。

建议类型：

```ts
interface BusinessAgentContext {
  kind: 'archive' | 'enterprise';
  archiveId?: string;
  enterpriseId?: string;
}
```

约束：

- `kind = 'archive'` 时必须有 `archiveId`
- `kind = 'enterprise'` 时必须有 `enterpriseId`
- ID 推荐统一按字符串传输，MCP 注入时再按工具要求转换为整数或字符串
- 不允许同时传入互相矛盾的业务类型

### 2. tRPC 输入校验

扩展 `ExecAgentSchema.appContext`，只允许受控字段：

```ts
businessContext: z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('archive'), archiveId: z.string().min(1) }),
  z.object({ kind: z.literal('enterprise'), enterpriseId: z.string().min(1) }),
]).optional();
```

不要使用 `z.any()` 接收业务上下文。

### 3. 权限校验

服务端收到 `businessContext` 后，需要在 `execAgent` 创建 operation 前做权限校验：

- `archiveId`：校验当前用户是否可访问该档案
- `enterpriseId`：校验当前用户是否可访问该企业
- 共享 Agent 本身的可用权限仍走现有共享 Agent 权限校验

校验失败时直接返回权限错误，不创建用户消息、助手消息和 operation。

如果当前系统的企业 / 档案数据来自旧 Go 系统或外部业务库，应提供一个轻量服务端校验函数。不要只在前端隐藏入口。

### 4. Operation 元数据透传

`AiAgentService.execAgent` 调用 `agentRuntimeService.createOperation` 时，将 `appContext.businessContext` 放入 createOperation 的 `appContext`。

这样它会随 operation 写入 `state.metadata`，后续每一步工具调用都可以读取。

注意：

- 业务 ID 不写入 Agent 表
- 业务 ID 不写入 Agent 的 `plugins`、`chatConfig`、`systemRole`
- 可按需写入 topic metadata 作为会话归属信息，但工具执行必须仍以当前运行态 `businessContext` 为准

### 5. ToolExecutionContext 扩展

在 `ToolExecutionContext` 中增加：

```ts
businessContext?: BusinessAgentContext;
```

`ServerToolTransport` 调用 `toolExecutionService.executeTool` 时，从 `context.state.metadata.businessContext` 传入。

该字段只用于服务端工具执行，不需要暴露给模型。

### 6. MCP 工具参数强制注入

在 `ToolExecutionService.executeMCPTool` 中，根据 `businessContext` 和工具类型改写 MCP 参数。

企业问答：

- 对需要企业限定的工具强制写入 `enterprise_id`
- 如果模型已经传了 `enterprise_id`，也要用页面传入的 `enterpriseId` 覆盖
- 如果当前是企业问答助手，但调用了不允许脱离企业上下文的工具且缺少 `businessContext.enterpriseId`，直接返回错误

文档问答：

- 对文档检索 / 查询工具强制写入 `archive_id`
- 如果现有 MCP 工具尚不支持 `archive_id`，需要补 MCP 工具能力
- 不建议仅靠提示词要求 “只查当前档案”
- 推荐新建独立文档问答 MCP 工具，不扩展 `company_archive_search`

建议增加一层工具白名单策略：

```ts
archiveContextTools = ['document_archive_search', 'document_archive_page_query'];

enterpriseContextTools = [
  'enterprise_basic_info_query',
  'search_enterprise_eia_elements',
  'enterprise_acceptance_pollution_query',
  'query_hazardous_waste_data',
  'enterprise_monitoring_data_query',
  'enterprise_permit_pollution_query',
  'enterprise_supervise_query',
  'enterprise_petition_query',
  'search_enterprise_penalty',
  'enterprise_enforcement_keypoints',
  'company_archive_search',
  'search_case',
];
```

初期可以配置为代码常量。后续如果业务助手增多，再抽成 MCP 工具 manifest 的扩展配置。

## MCP 侧要求

### MCP 服务组织方式

本方案选择 **A：继续使用现有 `hbai-mcp`，在同一个 MCP 服务下增加文档问答工具**。

不采用 **B：文档助手和企业助手分别使用完全单独的 MCP 服务**，除非后续出现强隔离部署、独立鉴权、独立扩缩容或不同团队运维边界的明确要求。

选择 A 的原因：

- 现有企业问答工具已经在 `hbai-mcp` 中，继续复用同一套部署、配置、日志和数据源连接。
- LobeHub 侧只需要维护一个 MCP 连接器，管理员创建 Agent 时按需选择工具即可。
- 文档助手和企业助手的隔离由两层保证：Agent 只绑定自己的工具；服务端工具执行层根据 `businessContext` 强制注入并覆盖 `archive_id` 或 `enterprise_id`。
- 新建第二套 MCP 会增加部署、配置、凭据、健康检查、发布和回滚成本，但对当前需求的收益不明显。

因此，下文 “新建文档问答 MCP 工具” 指的是：在 `hbai-mcp` 这个现有 MCP 服务里新增工具函数，不是新建第二个 MCP 服务。

### 企业问答助手

当前 `hbai-mcp` 企业类工具已经基本统一使用 `enterprise_id`，符合本方案。

需要调整的重点是：LobeHub 工具执行层自动覆盖工具入参中的 `enterprise_id`。

预期效果：

- 用户问 “这个企业的排污许可证有哪些？”
- 模型调用 `enterprise_permit_pollution_query`
- 即使模型没有传 `enterprise_id`，服务端也注入当前页面的 `enterpriseId`
- 工具只返回当前企业数据

### 文档问答助手

当前档案页 ES 检索主要按 `enterprise_id/company_id/scope` 过滤，不等同于 “当前档案” 过滤。

文档问答建议新建独立 MCP 工具：

- `document_archive_search(query, archive_id, top_k)`
- `document_archive_page_query(archive_id, page_num?)`

工具行为要求：

- `archive_id` 必填
- 只查询当前档案的 page/chunk
- 返回页面号、片段、标题、URL、引用 ID
- 不允许 `archive_id=0` 或空值时做全库检索

不建议扩展 `company_archive_search` 的原因：

- `company_archive_search` 是企业档案知识库工具，语义是 “按企业 / 范围检索企业相关档案”
- 文档问答助手的语义是 “只在当前打开的单个档案内问答”
- 两者过滤边界不同，混用容易出现跨档案引用
- 新建工具可以把 `archive_id` 设为必填，从 MCP 层直接避免全库检索回退

## 前端页面接入方式

### 档案详情页

右侧面板打开时：

- 从系统配置读取【文档问答助手】共享 Agent ID
- 根据配置中的 Agent ID 加载管理员创建的【文档问答助手】共享 Agent
- 从当前档案详情页 URL / 路由参数解析 `archiveId` 或 `archive_id`
- 会话作用域建议绑定到当前 `archiveId`
- 发送消息时携带：

```ts
appContext: {
  scope: 'business_archive',
  topicId,
  businessContext: {
    kind: 'archive',
    archiveId,
  },
}
```

### 企业详情页

右侧面板打开时：

- 从系统配置读取【企业问答助手】共享 Agent ID
- 根据配置中的 Agent ID 加载管理员创建的【企业问答助手】共享 Agent
- 从当前企业详情页 URL / 路由参数解析 `enterpriseId` 或 `enterprise_id`
- 会话作用域建议绑定到当前 `enterpriseId`
- 发送消息时携带：

```ts
appContext: {
  scope: 'business_enterprise',
  topicId,
  businessContext: {
    kind: 'enterprise',
    enterpriseId,
  },
}
```

### 会话隔离建议

建议按业务对象隔离 topic。当前业务约定：

- 档案详情页：一个档案默认一个 topic
- 企业详情页：按企业维持问答记录，在提问记录中展示历史

具体策略：

- 同一个用户、同一个文档问答助手、同一个 `archiveId` 默认复用一个档案问答 topic
- 同一个用户、同一个企业问答助手、同一个 `enterpriseId` 复用当前企业的问答 topic 或问答记录集合
- 不建议把不同档案 / 企业混在同一个 topic 下

原因：

- 历史上下文会影响回答
- 引用来源应属于当前业务对象
- 后续右侧面板恢复会话更清晰

如果已有 topic 的 `businessContext` 与当前页面不一致，应新建 topic，而不是继续复用。

清空记录：

- 企业详情页期望支持清空当前企业的提问记录
- 如果复用现有 topic 删除 / 归档能力改动较小，优先实现 “清空当前企业问答 topic”
- 如果清空能力牵涉较多历史会话模型改造，可先保留现有删除 / 归档入口，后续单独补 “清空当前企业记录”

## Agent 创建与配置步骤

### 创建文档问答助手

管理员进入 Agent 管理页面：

1. 新建 Agent，名称填写：`文档问答助手`
2. 开启 `share` 共享开关
3. 设置模型和参数
   - 模型选择业务默认大模型
   - 建议开启工具调用
   - 流式输出按现有系统默认
   - temperature 建议偏低，例如 `0.2 - 0.5`
4. 配置系统提示词
   - 明确身份：当前助手只回答当前档案相关问题
   - 明确规则：必须通过档案 MCP 工具检索当前档案后回答
   - 明确引用：回答涉及事实时给出引用页码或来源
   - 明确边界：如果当前档案没有依据，应说明未在当前档案中找到
5. 绑定 MCP 技能 / 工具
   - 只绑定档案问答相关工具
   - 推荐包含 `document_archive_search`
   - 推荐包含 `document_archive_page_query`
   - 不建议绑定企业全局统计类工具，避免跨域回答
6. 保存 Agent
7. 记录 Agent ID，登记到系统配置文件中，作为档案详情右侧面板加载的固定 Agent

文档问答助手提示词示例：

```text
你是文档问答助手，只能基于当前打开档案的内容回答问题。
当用户提问时，必须优先调用档案检索工具查询当前档案内容。
不要查询或引用其他档案的数据。
如果当前档案没有相关内容，请明确说明“当前档案中未找到依据”。
回答涉及档案原文时，请给出页码、片段或引用来源。
```

关键点：提示词里不需要写死 `archiveId`，`archiveId` 由页面运行态传入并由服务端注入 MCP 工具参数。

### 创建企业问答助手

管理员进入 Agent 管理页面：

1. 新建 Agent，名称填写：`企业问答助手`
2. 开启 `share` 共享开关
3. 设置模型和参数
   - 模型选择业务默认大模型
   - 建议开启工具调用
   - temperature 建议偏低，例如 `0.2 - 0.5`
4. 配置系统提示词
   - 明确身份：当前助手只回答当前企业相关问题
   - 明确规则：涉及企业业务数据时必须调用企业 MCP 工具
   - 明确边界：不得主动切换到其他企业
   - 明确引用：涉及档案、案例、处罚等应给出来源
5. 绑定 MCP 技能 / 工具
   - 企业基础信息：`enterprise_basic_info_query`
   - 环评要素：`search_enterprise_eia_elements`
   - 验收：`enterprise_acceptance_pollution_query`
   - 危废：`query_hazardous_waste_data`
   - 监测：`enterprise_monitoring_data_query`
   - 排污许可：`enterprise_permit_pollution_query`
   - 监管：`enterprise_supervise_query`
   - 信访：`enterprise_petition_query`
   - 处罚：`search_enterprise_penalty`
   - 执法要点：`enterprise_enforcement_keypoints`
   - 企业档案检索：`company_archive_search`
   - 案例检索：`search_case`
6. 保存 Agent
7. 记录 Agent ID，登记到系统配置文件中，作为企业详情右侧面板加载的固定 Agent

### 业务助手 Agent ID 配置

管理员创建完两个共享 Agent 后，需要把两个 Agent ID 登记到部署配置中。详情页本身只是使用入口，不提供让普通用户选择或编辑 Agent ID 的能力。

建议配置项：

```env
LOBE_BUSINESS_ARCHIVE_AGENT_ID=agt_xxx_document_qa
LOBE_BUSINESS_ENTERPRISE_AGENT_ID=agt_xxx_enterprise_qa
```

运行时规则：

- 档案详情页右侧面板读取 `LOBE_BUSINESS_ARCHIVE_AGENT_ID`，加载文档问答助手
- 企业详情页右侧面板读取 `LOBE_BUSINESS_ENTERPRISE_AGENT_ID`，加载企业问答助手
- `archiveId/archive_id` 来自档案详情页 URL / 路由参数，不来自配置文件
- `enterpriseId/enterprise_id` 来自企业详情页 URL / 路由参数，不来自配置文件
- 配置文件只保存 “使用哪个 Agent”，不保存 “当前问哪个档案 / 企业”

示例：

```text
档案详情页 URL: /enforcement/archive/12345
系统配置: LOBE_BUSINESS_ARCHIVE_AGENT_ID=agt_doc_qa

最终运行：
- agentId = agt_doc_qa
- businessContext.kind = archive
- businessContext.archiveId = 12345
```

企业问答助手提示词示例：

```text
你是企业问答助手，只回答当前打开企业相关的环保业务问题。
涉及企业基础信息、环评、验收、危废、监测、许可、监管、信访、处罚、档案或案例时，必须调用对应 MCP 工具。
不要自行猜测企业 ID，不要切换查询其他企业。
如果工具结果为空，请说明当前企业未查询到相关数据。
回答涉及数据来源时，请说明来自哪个工具或档案引用。
```

关键点：提示词里不需要写死 `enterpriseId`，`enterpriseId` 由页面运行态传入并由服务端注入 MCP 工具参数。

## 普通 Agent 与业务问答助手的关键区别

| 项目                        | 普通 Agent        | 文档问答助手                | 企业问答助手                   |
| --------------------------- | ----------------- | --------------------------- | ------------------------------ |
| 创建者                      | 普通用户或管理员  | 管理员                      | 管理员                         |
| 是否共享                    | 可私有，可共享    | 必须共享                    | 必须共享                       |
| 普通用户是否可编辑          | 私有 Agent 可编辑 | 不可编辑                    | 不可编辑                       |
| 业务 ID 来源                | 无固定要求        | 页面运行态 `archiveId`      | 页面运行态 `enterpriseId`      |
| 业务 ID 是否写入 Agent 配置 | 不适用            | 不写入                      | 不写入                         |
| 工具参数来源                | 模型按提示词生成  | 服务端强制注入 `archive_id` | 服务端强制注入 `enterprise_id` |
| 工具范围                    | 可自由配置        | 仅档案相关工具              | 企业业务相关工具               |
| 回答范围                    | 通用问答          | 当前档案                    | 当前企业                       |
| 会话隔离                    | 按 Agent/topic    | 建议按 `archiveId` 隔离     | 建议按 `enterpriseId` 隔离     |
| 权限校验                    | Agent / 会话权限  | Agent 权限 + 档案访问权限   | Agent 权限 + 企业访问权限      |
| 风险点                      | 工具误用          | 跨档案引用                  | 跨企业查询                     |

## 为什么不采用其他方案

### 不把业务 ID 写进 Agent 提示词

共享 Agent 是全局固定配置。把 `archiveId` 或 `enterpriseId` 写入提示词会导致：

- 同一个共享 Agent 无法服务不同页面
- 管理员每个业务对象都要建一个 Agent
- 普通用户打开不同档案 / 企业时配置会互相污染

### 不让前端直接修改 MCP 工具参数 schema

工具 schema 是 Agent 可视化配置的一部分，不应随页面动态变化。

业务 ID 应作为执行上下文进入服务端，再由服务端覆盖工具参数。

### 不依赖模型自己选择正确 ID

模型可能不调用工具、漏传 ID、传错 ID，或被用户诱导查询其他企业 / 档案。

业务隔离必须由服务端工具执行层保证。

### 不新建两套后端问答接口

如果从零写文档问答 / 企业问答接口，会失去 LobeHub 已有能力：

- 工具调用过程展示
- 引用来源展示
- Agent 调试面板
- 模型、提示词、参数可视化配置
- 共享 Agent 资源复用
- 会话和 topic 存储

## 数据保存策略

业务 ID 推荐分两层处理：

1. 运行态强约束：`businessContext` 随每次 `execAgent` 请求进入 operation metadata，工具执行以它为准。
2. 会话归属：topic metadata 可保存 `businessContext`，用于右侧面板恢复当前档案 / 企业的历史问答。

不要保存到：

- Agent `systemRole`
- Agent `chatConfig`
- Agent `plugins`
- MCP manifest 静态配置

## 错误处理

建议错误策略：

- 缺少 `businessContext`：业务助手拒绝执行上下文工具
- `kind` 与工具不匹配：拒绝调用，例如文档助手调用企业明细工具
- 无权限访问业务对象：创建 operation 前返回权限错误
- MCP 工具缺少必须参数：返回明确错误，不做全局查询
- 旧 topic 的业务上下文与当前页面不一致：新建 topic

用户可见错误文案示例：

- `当前问答助手缺少档案上下文，请从档案详情页重新打开。`
- `当前问答助手缺少企业上下文，请从企业详情页重新打开。`
- `当前用户无权访问该档案或企业。`
- `当前档案中未找到相关依据。`

## 验证清单

### 文档问答助手

- 在档案 A 打开右侧面板，提问 “这份档案主要讲什么”
- MCP 工具收到 `archive_id = A`
- 返回引用只包含档案 A
- 切换档案 B 后提问，MCP 工具收到 `archive_id = B`
- 档案 A 的历史 topic 不应混入档案 B
- 用户诱导 “查询另一个档案” 时，工具仍只查当前档案

### 企业问答助手

- 在企业 A 打开右侧面板，提问 “排污许可证有哪些”
- MCP 工具收到 `enterprise_id = A`
- 切换企业 B 后，MCP 工具收到 `enterprise_id = B`
- 用户问题中出现其他企业名时，工具仍覆盖为当前企业 ID
- 企业档案检索、案例检索也被限定到当前企业
- 无权限企业不能创建问答 operation

### LobeHub 能力保留

- 工具调用过程正常展示
- 工具结果正常落库为 tool message
- 引用来源正常展示
- 调试面板能看到工具调用
- Agent 配置页面仍可编辑提示词、模型、参数、工具
- 普通用户不能编辑共享业务 Agent

## 风险与控制

| 风险                | 说明                             | 控制措施                                    |
| ------------------- | -------------------------------- | ------------------------------------------- |
| 模型传错业务 ID     | 用户诱导或模型自行生成参数       | 服务端覆盖 MCP 参数                         |
| 缺少档案工具能力    | 当前 MCP 主要支持企业 ID         | 补 `archive_id` 限定工具                    |
| 历史 topic 串上下文 | 同一 Agent 下多个企业 / 档案混用 | topic metadata 保存业务归属，打开页面时过滤 |
| 权限绕过            | 前端传入未授权 ID                | 服务端创建 operation 前校验                 |
| 影响普通 Agent      | 新字段进入通用运行链路           | 字段 optional，仅业务 scope 生效            |
| 工具白名单维护成本  | 后续业务工具增加                 | 初期代码常量，后续可迁移到 manifest 扩展    |

## 实施顺序建议

1. 定义 `BusinessAgentContext` 类型与 `ExecAgentSchema` 校验。
2. 将 `businessContext` 从 `appContext` 写入 operation metadata。
3. 扩展 `ToolExecutionContext`，在 `ServerToolTransport` 透传。
4. 在 MCP 工具执行前增加业务参数注入和覆盖逻辑。
5. 企业问答先接入现有企业 MCP 工具。
6. 文档问答补 `archive_id` 限定 MCP 工具。
7. 档案详情页和企业详情页右侧面板接入共享 Agent ID。
8. 增加 topic 业务归属保存和恢复策略。
9. 补权限校验和测试用例。

## 开发任务清单

后续开发时以本清单为准，逐项更新状态。

状态说明：

- `待开始`：尚未进入开发
- `进行中`：正在开发或调试
- `已完成`：代码已实现并通过对应验证
- `受阻`：依赖外部信息、环境或方案确认，暂时无法继续

| 序号 | 任务                             | 目标                                                | 主要改动点                                                                                                                                | 状态   |
| ---: | -------------------------------- | --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------ |
|    1 | 确认业务 ID 字段                 | 明确档案和企业详情页使用的 URL 参数及后端主键       | LobeHub 运行态使用 `archiveId`/`enterpriseId`，MCP 入参使用 `archive_id`/`enterprise_id`；`enterpriseId` 对应 `co_polluter_enterprise.id` | 已完成 |
|    2 | 增加业务助手配置项               | 用配置文件登记两个共享 Agent ID                     | 新增 `LOBE_BUSINESS_ARCHIVE_AGENT_ID`、`LOBE_BUSINESS_ENTERPRISE_AGENT_ID` 读取逻辑                                                       | 已完成 |
|    3 | 前端暴露业务助手配置             | 让详情页可读取业务助手 Agent ID                     | server config /client config /business config 按现有模式扩展                                                                              | 已完成 |
|    4 | 定义 `BusinessAgentContext` 类型 | 建立运行态业务上下文结构                            | `packages/types/src/agentExecution/index.ts` 等共享类型                                                                                   | 已完成 |
|    5 | 扩展 `ExecAgentSchema` 校验      | 只允许受控业务上下文字段进入服务端                  | `apps/server/src/routers/lambda/aiAgent.ts` 增加 discriminated union 校验                                                                 | 已完成 |
|    6 | 创建 operation 时写入业务上下文  | 让业务 ID 进入 `state.metadata`                     | `AiAgentService.execAgent` 的 `createOperation.appContext` 透传 `businessContext`                                                         | 已完成 |
|    7 | 扩展工具执行上下文               | 让服务端工具执行能读取业务上下文                    | `ToolExecutionContext`、`ServerToolTransport` 透传 `businessContext`                                                                      | 已完成 |
|    8 | MCP 参数注入策略                 | 工具执行前强制覆盖业务 ID                           | `ToolExecutionService.executeMCPTool` 合并 / 覆盖 `enterprise_id`、`archive_id`                                                           | 已完成 |
|    9 | 企业工具白名单                   | 明确哪些 MCP 工具需要强制注入 `enterprise_id`       | 企业类 MCP 工具常量或配置映射                                                                                                             | 已完成 |
|   10 | 档案工具白名单                   | 明确哪些 MCP 工具需要强制注入 `archive_id`          | 档案类 MCP 工具常量或配置映射                                                                                                             | 已完成 |
|   11 | 企业详情右侧面板接入             | 企业页加载企业问答助手并传入当前企业 ID             | 企业详情页右侧面板、发送消息参数、topic 作用域                                                                                            | 进行中 |
|   12 | 档案详情右侧面板接入             | 档案页加载文档问答助手并传入当前档案 ID             | 档案详情页右侧面板、发送消息参数、topic 作用域                                                                                            | 进行中 |
|   13 | topic 业务归属策略               | 避免不同企业 / 档案复用同一历史上下文               | 档案默认一个档案一个 topic；企业按 `enterpriseId` 展示历史提问记录，并评估清空当前企业记录能力                                            | 进行中 |
|   14 | 企业访问权限校验                 | 防止越权查询企业数据                                | `execAgent` 创建 operation 前校验当前用户是否可访问 `enterpriseId`                                                                        | 待开始 |
|   15 | 档案访问权限校验                 | 防止越权查询档案数据                                | `execAgent` 创建 operation 前校验当前用户是否可访问 `archiveId`                                                                           | 待开始 |
|   16 | MCP 企业工具适配验证             | 确认现有企业 MCP 工具能接受注入后的 `enterprise_id` | `hbai-mcp` 企业工具联调                                                                                                                   | 待开始 |
|   17 | MCP 档案工具能力补齐             | 支持按当前 `archive_id` 限定检索 / 查询             | 新建独立 `document_archive_search`、`document_archive_page_query`，不扩展 `company_archive_search`                                        | 已完成 |
|   18 | 文档问答助手配置验证             | 管理员创建共享 Agent 并绑定档案工具                 | Agent 配置页面、share 开关、提示词、模型、工具                                                                                            | 待开始 |
|   19 | 企业问答助手配置验证             | 管理员创建共享 Agent 并绑定企业工具                 | Agent 配置页面、share 开关、提示词、模型、工具                                                                                            | 待开始 |
|   20 | 单元测试                         | 覆盖类型校验、上下文透传、参数覆盖                  | router schema、service、tool execution 测试                                                                                               | 进行中 |
|   21 | 集成测试                         | 覆盖页面发送到 MCP 工具的完整链路                   | 档案 / 企业详情页问答联调                                                                                                                 | 待开始 |
|   22 | 回归验证                         | 确认普通 Agent、私有 Agent、已有共享 Agent 不受影响 | 普通聊天、工具调用、引用展示、调试面板、会话历史                                                                                          | 待开始 |
|   23 | 部署配置说明                     | 明确生产环境需要配置的 Agent ID 和开关              | `.env` 示例、部署文档、管理员操作说明                                                                                                     | 待开始 |

本轮验证记录：

- 已通过 `npx vitest run apps/server/src/services/toolExecution/__tests__/index.test.ts`，覆盖 `archive_id` / `enterprise_id` 服务端覆盖逻辑。
- 已通过 `python -m py_compile hbai_mcp/app.py hbai_mcp/retrieval/archive_page.py`，确认新增 MCP 工具代码语法无误。
- 已执行 `npm run type-check`，当前失败来自仓库既有类型问题，未指向本轮改动文件；后续全量回归前需另行清理或确认这些既有问题。

## 已确认事项

- 文档问答在 LobeHub 运行态使用 `archiveId`，注入 MCP 工具时转换为 `archive_id`。
- 企业问答在 LobeHub 运行态使用 `enterpriseId`，注入 MCP 工具时转换为 `enterprise_id`。
- 企业详情页使用的企业 ID 是 `co_polluter_enterprise.id`。
- 档案详情页默认一个档案一个 topic；如果后续发现多 topic 改造范围明显更小，可按最小改动原则调整，但不能混用不同档案上下文。
- 企业详情页按企业维持历史提问记录，在提问记录中展示；清空当前企业记录作为期望能力，开发时评估复杂度后决定是否同步实现。
- 文档问答 MCP 工具新建独立工具，不扩展 `company_archive_search`。
