# 本地前端 + 后端开发（云端 infra）

目标：本机只跑 **前端（vite SPA）** 和 **后端（next dev）**，数据库 / Redis / 对象存储 /cyan 旧库 /onlyboxes/hbai-mcp 全部连云端，本机不启动任何 docker。

## 架构

```
浏览器 ── http://localhost:9876 ──► vite (SPA, 本机)
                                      │  /api /oidc /trpc /webapi 代理
                                      ▼
                                   next dev (后端, 本机 :3010)
                                      │  连接
            ┌─────────────────────────┼───────────────────────────┐
            ▼                         ▼                           ▼
   云端 Postgres(54322)      云端 Redis(6379)            云端 S3(s3.cyan.zj.cn)
   云端 cyan 旧库(8021)      onlyboxes(公网 onlyboxes.cyan.zj.cn)   hbai-mcp(服务器反代 /mcp)
```

- vite 默认就把 `/api` `/oidc` `/trpc` `/webapi` 代理到 `localhost:3010`（见 `vite.config.ts`），**无需改前端代码**。
- 后端 `next dev` 通过 `.env.development.local` 把上述 infra 指向云端。

## 一键启动

```bash
# 1. 首次需要安装依赖（arm64 装依赖没问题，只是 standalone 编译不行，dev 不受影响）
pnpm install

# 2. 从服务器 .env 拉取云端连接串，生成 .env.development.local
bash scripts/sync-local-env.sh

# 3. 启动（会并发起 next dev + vite，Ctrl+C 一起退出）
pnpm dev
#    打开 http://localhost:9876
```

> 端口说明：`pnpm dev` 启动后端在 `:3010`、前端 vite 在 `:9876`（已在 `.env.development.local` 固定 `SPA_PORT=9876`，与 `APP_URL` 一致）。`vite.config.ts` 的代理目标用的是 `localhost:3010`，与本地后端吻合。

## onlyboxes（公网独立域名）

onlyboxes 已由你配置为独立公网域名 `https://onlyboxes.cyan.zj.cn`（不再走 `lobe.cyan.zj.cn` 下的反代）。本地 `.env.development.local` 里的 `ONLYBOXES_BASE_URL=https://onlyboxes.cyan.zj.cn` 即对应这里，无需本机任何额外配置。

> 原 1Panel OpenResty 站点 `lobe.cyan.zj.cn` 下我加的 `proxy/onlyboxes.conf` 已按你的要求删除（删除后 `openresty -s reload` 重载即可）。

## hbai-mcp（已在服务器暴露，无需新增反代）

hbai-mcp 已通过 `proxy/mcp.conf` 暴露在 `https://lobe.cyan.zj.cn/mcp`，需要请求头 `X-Mcp-Token: hbai-poc-2026`。

本地后端要调用它，需要在 LobeChat 里把 hbai MCP 服务器的地址指向这个公网 URL（**建议用用户级 MCP，不要改线上全局配置，避免影响生产**）：

1. 打开本机 `http://localhost:9876` → 设置 → 工具 / MCP。
2. 添加 MCP 服务器，类型选 **Streamable HTTP**。
3. URL 填：`https://lobe.cyan.zj.cn/mcp`
4. Headers 加一行：`X-Mcp-Token: hbai-poc-2026`
5. 保存后用本地会话调用即可（用户级配置，不污染生产库里的 MCP 配置）。

> 如果生产里 hbai-mcp 是用内网地址 `http://172.17.0.1:8090` 配的全局 MCP，本机直接复用会连不通；用上面的用户级公网地址即可绕开。

## 警告

- **连的是生产库 / 生产 Redis**：本机测试产生的会话、文件、知识库等数据会直接写进线上库。务必清楚这一点。
- `next dev` 若触发数据库迁移，会作用到生产库（当前线上 schema 已是最新，等同空操作；但首次启动留意日志有无 `migrat` 字样）。
- `.env.development.local` 含生产密钥，已被 `.gitignore` 忽略，**切勿提交**。
- 服务器 54322 / 6379 / 8089 仅本机经公网访问；如有条件建议在华为云安全组把来源限制为你的出口 IP。

## 排错

- `pnpm dev` 起不来先确认 `pnpm install` 已完成、`bun` 在 PATH（`pnpm dev` 内部用 `bunx next dev`）。
- 登录 401 / 会话不生效：确认 `KEY_VAULTS_SECRET` / `AUTH_SECRET` / `JWKS_KEY` 与线上一致（由 `sync-local-env.sh` 同步）。
- onlyboxes 沙箱报错：确认 `curl -k https://onlyboxes.cyan.zj.cn/` 能到达（返回 onlyboxes 的响应即可，404 也说明路由通）。
- hbai-mcp 调不通：确认 MCP 服务器 URL 为公网 `/mcp` 且带了 `X-Mcp-Token` 头。
