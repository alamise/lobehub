#!/usr/bin/env bash
# 从服务器 /opt/program/lobehub/.env 拉取云端 infra 连接串，生成本地开发用的
# .env.development.local（供 `pnpm dev` 启动的 next dev 后端使用）。
#
# 用法：
#   bash scripts/sync-local-env.sh
# 可选覆盖：
#   KEY_FILE=/path/to.pem REMOTE=root@1.94.98.151 bash scripts/sync-local-env.sh
#
# 生成的 .env.development.local 已被 .gitignore 忽略（.env*.local），切勿提交。
# 该文件把所有 infra（Postgres/Redis/S3/onlyboxes/cyan旧库）指向云端，
# 浏览器入口走 next dev，vite 只作为 SPA 资源开发服务器。

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"   # lobehub 仓库根
KEY_FILE="${KEY_FILE:-$HERE/../dongjiming.pem}"
REMOTE="${REMOTE:-root@1.94.98.151}"
SRV_ENV="/opt/program/lobehub/.env"
OUT="$HERE/.env.development.local"

command -v ssh >/dev/null || { echo "缺少 ssh" >&2; exit 1; }
[[ -f "$KEY_FILE" ]] || { echo "SSH 证书不存在: $KEY_FILE" >&2; exit 1; }

TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT

ssh -i "$KEY_FILE" -o StrictHostKeyChecking=accept-new -o ConnectTimeout=15 "$REMOTE" "cat '$SRV_ENV'" > "$TMP"

get() {
  local v
  v="$(grep -E "^$1=" "$TMP" | head -1 | cut -d= -f2-)"
  if [[ -z "$v" ]]; then
    echo "⚠️  服务器 .env 缺少键: $1" >&2
  fi
  printf '%s' "$v"
}

POSTGRES_PW="$(get POSTGRES_PASSWORD)"
REDIS_PW="$(get REDIS_PASSWORD)"
S3_EP="$(get S3_ENDPOINT)"
RUSTFS_AK="$(get RUSTFS_ACCESS_KEY)"
RUSTFS_SK="$(get RUSTFS_SECRET_KEY)"
RUSTFS_BUCKET="$(get RUSTFS_LOBE_BUCKET)"
ONLYBOXES_KEY="$(get ONLYBOXES_JIT_SIGNING_KEY)"
ONLYBOXES_ISSUER="$(get ONLYBOXES_JIT_ISSUER)"
CASE_DB="$(get CASE_ARCHIVE_DATABASE_URL)"
KV="$(get KEY_VAULTS_SECRET)"
AUTH_SECRET="$(get AUTH_SECRET)"
JWKS="$(get JWKS_KEY)"
SILI="$(get SILICONCLOUD_API_KEY)"
ONLYBOXES_BASE_URL="${ONLYBOXES_BASE_URL:-https://onlyboxes.cyan.zj.cn}"

# 必填校验
for v in POSTGRES_PW REDIS_PW S3_EP RUSTFS_AK RUSTFS_SK RUSTFS_BUCKET ONLYBOXES_KEY ONLYBOXES_ISSUER CASE_DB KV AUTH_SECRET JWKS SILI; do
  if [[ -z "${!v}" ]]; then
    echo "❌ 必要键 $v 为空，终止" >&2
    exit 1
  fi
done

# 保留本地已有的 QSTASH_* 凭证（来自你本机 .env.development.local，不在服务器 .env 中，
# 重生成时须保留，否则本地 dev 的 QStash 警告会回来）
EXISTING_QSTASH=""
if [[ -f "$OUT" ]]; then
  EXISTING_QSTASH="$(grep -E '^QSTASH_' "$OUT" || true)"
fi

cat > "$OUT" <<EOF
# 本地开发环境（由 scripts/sync-local-env.sh 从服务器 .env 生成，勿手改/勿提交）
# 浏览器入口(next dev) + SPA 资源服务(vite) 本机跑；infra 全部连云端。
NODE_ENV=development

# ---- 数据库：云端 Postgres（公网 1.94.98.151:54322，注意这是生产库）----
DATABASE_URL=postgresql://postgres:${POSTGRES_PW}@1.94.98.151:54322/lobechat
DATABASE_DRIVER=node

# ---- Redis：云端（公网 1.94.98.151:6379，已设密码）----
REDIS_URL=redis://:${REDIS_PW}@1.94.98.151:6379
REDIS_PREFIX=lobechat

# ---- 对象存储：云端 S3（公网 s3.cyan.zj.cn）----
S3_ENDPOINT=${S3_EP}
RUSTFS_ACCESS_KEY=${RUSTFS_AK}
RUSTFS_SECRET_KEY=${RUSTFS_SK}
RUSTFS_LOBE_BUCKET=${RUSTFS_BUCKET}

# ---- Onlyboxes 私有沙箱（公网独立域名 onlyboxes.cyan.zj.cn）----
SANDBOX_PROVIDER=onlyboxes
ONLYBOXES_BASE_URL=${ONLYBOXES_BASE_URL}
ONLYBOXES_JIT_SIGNING_KEY=${ONLYBOXES_KEY}
ONLYBOXES_JIT_ISSUER=${ONLYBOXES_ISSUER}

# ---- cyan 旧库（业务页，公网 183.134.109.225:8021）----
CASE_ARCHIVE_DATABASE_URL=${CASE_DB}

# ---- 密钥（须与线上一致，否则会话/加密不兼容）----
KEY_VAULTS_SECRET=${KV}
AUTH_SECRET=${AUTH_SECRET}
JWKS_KEY=${JWKS}

# ---- 嵌入模型 ----
SILICONCLOUD_API_KEY=${SILI}
DEFAULT_FILES_CONFIG=embedding_model=siliconcloud/Qwen/Qwen3-Embedding-8B

# ---- 本机地址 ----
# 浏览器入口必须走 Next，页面中间件才会执行登录保护；Vite 只提供 SPA 资源。
APP_URL=http://localhost:3010
INTERNAL_APP_URL=http://localhost:3010
SPA_PORT=9876

# ---- Upstash QStash（本地 dev 用，消除 "client token is not set" 警告；不从服务器拉取）----
${EXISTING_QSTASH}
EOF

echo "✅ 已生成 $OUT"
echo "   包含的键：DATABASE_URL / REDIS_URL / S3_ENDPOINT / ONLYBOXES_BASE_URL / CASE_ARCHIVE_DATABASE_URL / KEY_VAULTS_SECRET / AUTH_SECRET / JWKS_KEY / SILICONCLOUD_API_KEY"
echo "   提示：修改 ONLYBOXES_BASE_URL 可覆盖地址（默认 https://onlyboxes.cyan.zj.cn）"
