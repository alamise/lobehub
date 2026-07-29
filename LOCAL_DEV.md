# 本地前端 + 后端开发（云端 infra）

目标：本机只跑 **前端（vite SPA）** 和 **后端（next dev）**，数据库 / Redis / 对象存储 /cyan 旧库 /onlyboxes/hbai-mcp 全部连云端，本机不启动任何 docker。

## 架构

```
浏览器 ── http://localhost:3010 ──► next dev (页面中间件 + 后端, 本机)
                                      │  开发期 SPA 资源
                                      ▼
                                   vite (SPA, 本机 :9876)
                                      │  连接
            ┌─────────────────────────┼───────────────────────────┐
            ▼                         ▼                           ▼
   云端 Postgres(54322)      云端 Redis(6379)            云端 S3(s3.cyan.zj.cn)
   云端 cyan 旧库(8021)      onlyboxes(公网 onlyboxes.cyan.zj.cn)   hbai-mcp(服务器反代 /mcp)
```

- 浏览器入口使用 `localhost:3010`，这样请求会先经过 Next 页面中间件，未登录时会跳转到 `/signin`。
- vite 仍在 `localhost:9876` 提供开发期 SPA 资源；不要把它作为浏览器入口，否则会绕过 Next 页面中间件。
- 后端 `next dev` 通过 `.env.development.local` 把上述 infra 指向云端。

## 前置要求（Node 版本与一处源码修复）

⚠️ **历史坑（已修复）**：早期在 `next dev` 下首页会报
`TypeError: The "original" argument must be of type function. Received undefined`
（来自 `packages/agent-tracing/src/store/remote-store.ts`，导致首页调用的
`/trpc/lambda/config.getGlobalConfig` 路由 500）。

**根因不是 Node 版本**，而是该文件用了 `import { zstdDecompress } from 'node:zlib'`——
`node:zlib` 是 CJS 模块、`zstdDecompress` 由惰性 getter 提供，`next dev` 的 Turbopack
打包器无法静态识别这个具名导出，编译后解析成 `undefined`，`promisify(undefined)` 在模块
求值阶段即崩溃。**生产构建走不同打包路径，所以线上没暴露。**

**已修复**：把 `remote-store.ts` 改为运行时 `require('node:zlib')` 取整个模块对象再访问
属性，并在该 API 不可用时优雅降级（见文件顶部注释）。现在 `pnpm dev` 在**任意 Node 版本**
下都不会再报这个错，dev 用 Node 24 或 22.22.2 均可。

仓库已放 `.nvmrc`（`24`）。切换方式：

```bash
# nvm（本机已装 v24.18.0，直接 use 即可，无需联网下载；不要跑 nvm install 24，离线会失败）
nvm use 24
```

> 说明：`nvm install 24` 会因本机无法访问 nodejs.org 而报 "Version '24' not found"；
> 用已装好的版本即可，命令是 `nvm use 24`，不是 `nvm install`。若 shell 配了 auto-nvm-use
> 插件，`cd` 进目录会自动切；否则每次新开终端手动 `nvm use 24` 一次。

## 一键启动

```bash
# 1. 首次需要安装依赖 —— ⚠️ 见下方「重装依赖」注意：必须用 Node 24 以外的 Node 装
pnpm install

# 2. 从服务器 .env 拉取云端连接串，生成 .env.development.local
bash scripts/sync-local-env.sh

# 3. 启动（会并发起 next dev + vite，Ctrl+C 一起退出）
nvm use 24 # dev 用 Node 24（或 22.22.2 均可；zstd 报错已从源头修复，见「前置要求」）
pnpm dev
#    打开 http://localhost:3010
```

> 端口说明：`pnpm dev` 启动后端在 `:3010`、前端 vite 在 `:9876`（已在 `.env.development.local` 固定 `SPA_PORT=9876`）。`APP_URL` 指向 `localhost:3010`，因为登录保护由 Next 页面中间件执行；直接打开 `localhost:9876` 会绕过这层保护。

## 重装依赖的坑（ERR\_INVALID\_THIS，重要）

在 **Node 24** 下直接 `pnpm install` 会报 `WARN GET https://registry.npmmirror.com/... error (ERR_INVALID_THIS)`，且最终 `node_modules` 会被清空却装不全（Recreating 后失败）。这是 **Node 24.18 + 当前 pnpm（10.23.0/10.33.0）的兼容 bug**（Node 22.22.2 同版本 pnpm 不触发）。

> **与「前置要求」不冲突**：dev 现在在任意 Node 都能跑（zstd 报错已从源码修复）；但**装依赖**仍不能用 Node 24（会踩 `ERR_INVALID_THIS` 把 `node_modules` 清空）。所以还是「用 Node 22.22.2 /v20.18.1 装，用 Node 24 跑 dev」。已验证「用 Node 22.22.2 装好的 node\_modules，在 Node 24 下 dev 完全正常」（原生模块 non-ABI 问题，已实测通过）。

**正确装法（任选其一，关键：install 时别用 Node 24）**：

```bash
# 方案 A（最稳，已验证）：用本机托管的 Node 22.22.2 装
export PATH=/Users/dongjiming/.workbuddy/binaries/node/versions/22.22.2/bin:$PATH
pnpm install
pnpm rebuild # 补 esbuild/sharp 等被 pnpm v10 默认拦截的原生构建脚本
# 装完后切回 Node 24 跑 dev：
nvm use 24 && pnpm dev

# 方案 B：用 nvm 里 < 22.12 的 Node（如 v20.18.1）装，再 nvm use 24 跑 dev
nvm use 20.18.1 && pnpm install && pnpm rebuild
nvm use 24 && pnpm dev
```

> 注意：nvm 里的 `v22.12.0` 也会触发该 bug（22.12 起 Node 改了 fetch/URL），不要用它装。装完依赖后日常 dev 用 Node 24 即可，无需重装。

## onlyboxes（公网独立域名）

onlyboxes 已由你配置为独立公网域名 `https://onlyboxes.cyan.zj.cn`（不再走 `lobe.cyan.zj.cn` 下的反代）。本地 `.env.development.local` 里的 `ONLYBOXES_BASE_URL=https://onlyboxes.cyan.zj.cn` 即对应这里，无需本机任何额外配置。

> 原 1Panel OpenResty 站点 `lobe.cyan.zj.cn` 下我加的 `proxy/onlyboxes.conf` 已按你的要求删除（删除后 `openresty -s reload` 重载即可）。

## hbai-mcp（已在服务器暴露，无需新增反代）

hbai-mcp 已通过 `proxy/mcp.conf` 暴露在 `https://ai-hb.cyan.zj.cn/mcp`，需要请求头 `X-Mcp-Token: hbai-poc-2026`。

本地后端要调用它，需要在 LobeChat 里把 hbai MCP 服务器的地址指向这个公网 URL（**建议用用户级 MCP，不要改线上全局配置，避免影响生产**）：

1. 打开本机 `http://localhost:3010` → 设置 → 工具 / MCP。
2. 添加 MCP 服务器，类型选 **Streamable HTTP**。
3. URL 填：`https://ai-hb.cyan.zj.cn/mcp`
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
