# 档案引用锚点跳转开发计划

## 背景

前序方案见 [business-context-agent-plan.zh-CN.md](/Users/dongjiming/software/tencent-cloud/lobehub/docs/deployment/business-context-agent-plan.zh-CN.md)。该方案已明确文档问答助手、企业问答助手复用 LobeHub Agent Runtime，并通过 `businessContext` 在服务端强制注入 `archive_id` / `enterprise_id`，限定 MCP 工具只查询当前业务对象。

本次需求在前序能力上补齐 “引用 + 页面跳转” 链路：

- MCP 工具检索档案页面时，在页码之外返回系统内部相对路径，并在路径中携带页面锚点。
- 档案详情页识别 URL hash 中的分页锚点，自动切换到对应分页。
- 聊天回答中的引用标记点击后，读取相对路径并联动左侧档案分页区域切换。

## 当前代码基础

### LobeHub 侧

- 档案详情页位于 `src/features/BusinessArchiveDetailPage/index.tsx`。
- 当前档案页路由为 `/enforcement/archive/:id`。
- 当前分页状态来自 URL query：`pageNum`，通过 `setSearchParams(..., { replace: true })` 更新。
- 页面采用单页 / 缩略图两种预览模式，不是长滚动；切页本质是更新 `selectedPageNum`。
- 右侧问答面板位于 `src/features/BusinessAgentChatPanel/index.tsx`。
- 问答面板目前用 `ReactMarkdown` 直接渲染 `record.answer`，没有自定义链接点击处理。
- `BusinessAgentChatPanel` 已经向 `execAgentTask` 传入 `appContext.businessContext`。

### hbai-mcp 侧

- MCP 服务位于 `/Users/dongjiming/software/tencent-cloud/hbai-mcp`。
- 文档问答工具已存在：
  - `document_archive_search(query, archive_id, top_k)`
  - `document_archive_page_query(archive_id, page_num, top_k)`
- 通用档案页返回组装位于 `hbai_mcp/retrieval/archive_page.py` 的 `ArchivePageSearcher._build_record`。
- 当前 page 记录已包含 `ref_id`、`archive_id`、`page_num`、`url`、`content`、`source_path` 等字段。
- 当前 `url` 多为旧系统完整地址，例如 `https://ai-sthjj.hzyuhang.cn:8000/#/archives/{archive_id}?pageNum={page_num}`。

## 目标

1. 在档案页面型 MCP 结果中补充内部相对路径字段，格式稳定、可被提示词引用、可被前端点击解析。
2. 档案详情页支持从 hash 锚点解析目标页码，自动切换单页预览到对应页面。
3. 业务问答面板支持点击回答内引用链接，在不跳转离开当前页面的情况下联动档案分页。
4. 改造范围轻量化，不重构会话、分页、MCP 执行和底层 Markdown 渲染机制。

## 非目标

- 不重构 LobeHub 通用会话消息渲染。
- 不改造普通 Agent 的引用渲染逻辑。
- 不引入新的后端问答接口。
- 不调整 Agent Runtime、operation、MCP transport 的基础协议。
- 不把引用标记生成做成硬编码后处理；引用标记仍通过业务助手提示词要求模型按约定输出。

## 锚点与路径约定

### 推荐字段

MCP 每个档案页结果新增字段：

```json
{
  "anchor": "#pageNum=7",
  "relative_path": "/enforcement/archive/12345#pageNum=7"
}
```

字段说明：

- `relative_path`：系统内部相对路径，给模型作为引用链接目标。
- `anchor`：页面锚点片段，便于调试和后续扩展。
- `url`：保留现有字段，继续兼容旧系统或外部链接，不作为本次前端内部联动的首选字段。

### 锚点格式

统一使用：

```text
#pageNum={page_num}
```

选择该格式的原因：

- 与当前页面已有 `pageNum` query 参数语义一致，降低转换成本。
- hash 只变更页面锚点，符合 “页面基础 URL 保持不变” 的约束。
- 页面可以同时兼容旧 query `?pageNum=7` 和新 hash `#pageNum=7`。

### 相对路径格式

普通企业档案：

```text
/enforcement/archive/{archive_id}#pageNum={page_num}
```

知识库档案如果后续接入同一助手，可扩展为：

```text
/enforcement/archive/{archive_id}?source=knowledge#pageNum={page_num}
```

本次优先覆盖当前已接入文档问答助手的普通档案页；知识库入口保持现有禁用策略，不扩大范围。

## 实施计划

## 任务清单

后续开发过程中，需要在每个任务完成或状态变化后同步更新本表。

| 序号 | 任务                                          | 涉及范围                                                                    | 验收点                                                                               | 开发状态 |
| ---- | --------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | -------- |
| 1    | MCP 新增档案页锚点构造函数                    | `hbai-mcp/hbai_mcp/shared/search_common.py`                                 | 能生成 `#pageNum=N` 和 `/enforcement/archive/{archive_id}#pageNum={page_num}`        | 已完成   |
| 2    | MCP 档案页结果返回 `relative_path` / `anchor` | `hbai-mcp/hbai_mcp/retrieval/archive_page.py`                               | `document_archive_search` 和 `document_archive_page_query` 的 `pages[]` 均包含新字段 | 已完成   |
| 3    | MCP 工具说明与 README 更新                    | `hbai-mcp/hbai_mcp/app.py`、`hbai-mcp/README.md`                            | 工具说明明确提示模型优先使用 `relative_path` 生成引用                                | 已完成   |
| 4    | 文档问答助手提示词更新                        | 管理员配置的共享 Agent 提示词                                               | 回答引用按 `[P{page_num}]({relative_path})` 生成                                     | 待配置   |
| 5    | 档案详情页 hash 页码解析                      | `lobehub/src/features/BusinessArchiveDetailPage/index.tsx`                  | 直接打开 `/enforcement/archive/123#pageNum=7` 可切换到第 7 页                        | 已完成   |
| 6    | 档案详情页监听 `hashchange`                   | `lobehub/src/features/BusinessArchiveDetailPage/index.tsx`                  | 同页 hash 变化能触发分页切换，不需要刷新页面                                         | 已完成   |
| 7    | 业务问答面板拦截内部引用链接                  | `lobehub/src/features/BusinessAgentChatPanel/index.tsx`                     | 点击当前档案引用不发生整页跳转，并触发回调                                           | 已完成   |
| 8    | 档案详情页接入引用点击回调                    | `lobehub/src/features/BusinessArchiveDetailPage/index.tsx`                  | 点击 `[P7](/enforcement/archive/123#pageNum=7)` 后左侧预览切第 7 页                  | 已完成   |
| 9    | 前端单元测试补充                              | `lobehub/src/features/BusinessAgentChatPanel/index.test.tsx` 及必要新增测试 | 覆盖内部链接点击、跨档案链接不拦截、hash 页码解析                                    | 已完成   |
| 10   | MCP 本地验证                                  | `hbai-mcp` 本地函数或 tools/call                                            | 确认新字段存在，旧 `url` 字段不回退                                                  | 已验证   |
| 11   | 端到端人工联调                                | LobeHub + hbai-mcp                                                          | 模型回答生成引用，点击引用联动档案分页                                               | 待验证   |

### 阶段 1：MCP 返回字段改造

改造位置：

- `/Users/dongjiming/software/tencent-cloud/hbai-mcp/hbai_mcp/shared/search_common.py`
- `/Users/dongjiming/software/tencent-cloud/hbai-mcp/hbai_mcp/retrieval/archive_page.py`
- `/Users/dongjiming/software/tencent-cloud/hbai-mcp/hbai_mcp/app.py` 工具说明文案
- `/Users/dongjiming/software/tencent-cloud/hbai-mcp/README.md` 工具返回说明

计划：

1. 在 `search_common.py` 新增纯函数：
   - `build_archive_anchor(page_num) -> "#pageNum={page_num}"`
   - `build_archive_relative_path(archive_id, page_num, source="") -> "/enforcement/archive/{archive_id}#pageNum={page_num}"`
2. 在 `ArchivePageSearcher._build_record` 中，当 `archive_id` 和 `page_num` 有效时新增：
   - `anchor`
   - `relative_path`
3. 保留现有 `url` 字段，不改字段含义，避免影响企业问答、案例检索和旧调用方。
4. 更新 `document_archive_search`、`document_archive_page_query` 的 docstring，明确模型引用应优先使用 `relative_path`。

返回示例：

```json
{
  "anchor": "#pageNum=7",
  "archive_id": 12345,
  "archive_name": "某项目环评批复",
  "content": "页面片段...",
  "page_num": 7,
  "ref_id": "12345_7",
  "relative_path": "/enforcement/archive/12345#pageNum=7",
  "title": "某项目环评批复",
  "url": "https://ai-sthjj.hzyuhang.cn:8000/#/archives/12345?pageNum=7"
}
```

### 阶段 2：提示词配置更新

无需修改底层渲染机制，只调整管理员配置的文档问答助手提示词。

建议追加规则：

```text
当回答依据来自 document_archive_search 或 document_archive_page_query 的 pages 结果时，必须在对应事实后生成引用标记。
引用标记使用 Markdown 链接格式：[P{page_num}]({relative_path})。
如果同一段话引用多个页面，可以连续列出多个引用，例如 [P3](/enforcement/archive/123#pageNum=3) [P8](/enforcement/archive/123#pageNum=8)。
不得编造 page_num 或 relative_path，只能使用工具返回的字段。
```

示例回答：

```markdown
该档案主要描述项目审批意见和污染防治要求，其中废水处理和排放去向在第 7 页有明确说明。[P7](/enforcement/archive/12345#pageNum=7)
```

### 阶段 3：档案详情页 hash 解析

改造位置：

- `/Users/dongjiming/software/tencent-cloud/lobehub/src/features/BusinessArchiveDetailPage/index.tsx`

计划：

1. 增加 hash 解析函数，支持以下格式：
   - `#pageNum=7`
   - `#page=7`，可作为宽松兼容
   - `#p7`，可选兼容，不作为提示词推荐格式
2. 页面初始化时，如果 hash 存在有效页码，优先使用 hash 页码；否则沿用当前 query `pageNum`。
3. 监听 `hashchange` 事件，用户点击同页引用时也能更新当前分页。
4. hash 页码变化时调用现有 `setSelectedPageNum` 的等价逻辑，但只更新 hash 或同步 query 时避免循环触发。
5. 页码越界处理：
   - 小于 1：忽略。
   - 大于 `totalPages`：加载页列表后忽略，并可用 `message.warning('引用页码不存在')`。
6. 切换成功后强制 `previewMode = 'page'`，避免用户停留在缩略图模式时看不到目标页。

建议保留 query 兼容：

- 用户直接打开 `/enforcement/archive/123?pageNum=7` 仍显示第 7 页。
- 用户点击 `/enforcement/archive/123#pageNum=7` 后基础 URL 不变，只变更 hash。
- 当前工具栏上一页 / 下一页可以继续维护 `pageNum` query；本需求只要求引用点击变更 hash，不强制移除 query。

### 阶段 4：业务聊天引用点击

改造位置：

- `/Users/dongjiming/software/tencent-cloud/lobehub/src/features/BusinessAgentChatPanel/index.tsx`
- 必要时调整 `src/features/BusinessAgentChatPanel/index.test.tsx`

计划：

1. 给 `BusinessAgentChatPanel` 增加可选回调：

```ts
onInternalReferenceClick?: (href: string) => void;
```

2. 在 `ReactMarkdown` 中覆盖 `a` 组件：
   - 如果 `href` 是 `/enforcement/archive/{contextId}#pageNum=N`，阻止默认跳转并调用回调。
   - 如果 `href` 是当前档案同页 hash `#pageNum=N`，也调用回调。
   - 其他链接按默认行为处理或安全打开，不扩大本次范围。
3. 档案详情页向 `BusinessAgentChatPanel` 传入回调：
   - 校验 `archive_id` 与当前 `archiveId` 一致。
   - 使用 `window.history.replaceState` 或 `navigate` 只更新当前 URL hash。
   - 触发本页 hash 解析逻辑切换分页。
4. 点击引用后切换 `previewMode = 'page'`，并保持右侧聊天记录不重置。

这样引用链接仍是标准 Markdown 链接，生成规则由提示词控制，前端只增加业务页内链接拦截。

### 阶段 5：测试与验证

MCP 单元 / 本地函数验证：

- `document_archive_search` 返回的 `pages[]` 包含 `relative_path` 和 `anchor`。
- `document_archive_page_query` 指定 `page_num` 返回相同字段。
- `archive_id <= 0` 或 `page_num <= 0` 时不生成无效路径。
- 旧字段 `url` 仍存在。

LobeHub 前端测试：

- 档案详情页打开 `/enforcement/archive/123#pageNum=7` 后显示第 7 页。
- 已有 `/enforcement/archive/123?pageNum=7` 仍可显示第 7 页。
- 点击聊天回答中的 `[P7](/enforcement/archive/123#pageNum=7)`，左侧档案区域切换第 7 页，页面不离开当前档案。
- 点击其他档案 ID 的相对路径时不切换当前页面，避免跨档案误跳。
- 点击无效页码时不破坏当前页状态。

人工联调：

1. 在档案 A 打开 “当前档案问答”。
2. 提问要求模型引用原文页。
3. 确认工具结果包含 `relative_path`。
4. 确认回答生成 `[P页码](相对路径)`。
5. 点击引用后左侧预览切到对应页。
6. 刷新页面后如果 hash 保留，仍进入对应页。

## 风险与处理

| 风险                                       | 处理                                                                      |
| ------------------------------------------ | ------------------------------------------------------------------------- |
| 模型没有按提示词生成 Markdown 链接         | 先通过提示词约束解决；不在本次做回答内容后处理                            |
| 工具返回旧 `url` 被模型优先使用            | docstring 和提示词明确优先 `relative_path`，保留 `url` 仅兼容             |
| `ReactMarkdown` 链接被默认导航导致整页跳走 | 在业务面板覆盖 `a` 组件，仅拦截当前档案内部路径                           |
| hash 与 query `pageNum` 同时存在且不一致   | hash 优先用于引用跳转；query 继续兼容手动打开和分页按钮                   |
| 页面列表尚未加载完时解析 hash              | 先记录目标页码，`pages` 加载完成后再解析 `currentPage`                    |
| 企业问答引用企业档案时也想跳档案页         | 本次只做 “当前档案问答联动当前档案分页”；企业问答跨页面打开可后续单独设计 |

## 建议开发顺序

1. 先改 MCP 返回 `relative_path` / `anchor`，用本地函数或 MCP tools/call 验证字段。
2. 更新文档问答助手提示词，让模型输出标准 Markdown 引用。
3. 改档案详情页 hash 解析和 `hashchange` 监听。
4. 改业务聊天面板链接拦截，接入档案详情页回调。
5. 补单元测试和一次人工端到端联调。

## 验收标准

- MCP 档案页检索结果同时返回页码和带 hash 的内部相对路径。
- 文档问答回答中可展示形如 `[P7](/enforcement/archive/12345#pageNum=7)` 的引用标记。
- 用户点击引用标记后，当前档案详情页左侧分页预览自动切换到第 7 页。
- 点击引用不会重建会话、不会刷新整页、不会改变当前档案基础路径。
- 现有上一页 / 下一页、缩略图切换、普通 `pageNum` query 访问不回退。
