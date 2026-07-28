# 余小环品牌与发布说明

## 品牌配置

余小环品牌名称、Logo 地址集中维护在：

```text
packages/business/const/src/branding.ts
```

当前 Logo 使用外部静态资源地址：

```text
https://static.cyan.zj.cn/cyan-logo.png
```

注意：Logo URL 在代码中使用运行时拼接，避免前端构建工具把完整的 `https://...png` 字符串误识别为站内静态资源并编译成 `/https://...`。

## favicon

favicon 使用同一个 Logo 生成，当前需要同步维护这些文件：

```text
public/favicon.ico
public/favicon-32x32.ico
public/apple-touch-icon.png
public/icons/icon-192x192.png
public/icons/icon-192x192.maskable.png
public/icons/icon-512x512.png
public/icons/icon-512x512.maskable.png
```

这些文件会在 Docker 镜像构建时进入生产镜像。

## 生产发布方式

生产环境使用 Docker 镜像发布。当前 compose 使用固定镜像 tag，发布时重新构建同一 tag 并强制重建容器。不要在 `lobe` 服务上挂载 `/app` 整目录：

```yaml
services:
  lobe:
    image: lobehub/lobehub:<version>
```

不要使用：

```yaml
services:
  lobe:
    volumes:
      - /opt/program/lobe-app:/app
```

整目录挂载会绕过镜像内置的构建产物，容易让旧的 `.next`、SPA bundle、启动脚本或依赖覆盖新镜像，导致线上运行内容和镜像标签不一致。

## 手动改代码后的发布步骤

以下流程用于本机手动修改代码后发布到服务器 `1.94.98.151`。

约定目录：

```text
本机源码：/Users/dongjiming/software/tencent-cloud/lobehub
服务器生产目录：/opt/program/lobehub
服务器构建目录：/opt/program/lobehub-build
```

### 1. 本机确认改动

在本机源码目录执行：

```bash
cd /Users/dongjiming/software/tencent-cloud/lobehub
git status --short
git diff --check
```

确认只包含本次要发布的文件，且没有空白字符错误。

### 2. 同步代码到服务器构建目录

推荐用 `rsync` 同步本机工作树到服务器构建目录，并排除本地构建缓存：

```bash
cd /Users/dongjiming/software/tencent-cloud/lobehub

rsync -az \
  --exclude='.git/' \
  --exclude='node_modules/' \
  --exclude='.next/' \
  --exclude='dist/' \
  --exclude='.pnpm-store/' \
  --exclude='build*.log' \
  --exclude='tsconfig.tsbuildinfo' \
  -e 'ssh -i /Users/dongjiming/software/tencent-cloud/dongjiming.pem -o StrictHostKeyChecking=no' \
  ./ root@1.94.98.151:/opt/program/lobehub-build/
```

当前不使用 `--delete`，避免误删服务器构建目录里的必要辅助文件。确需清理时单独评估。

### 3. 在服务器构建新镜像

当前线上 compose 使用固定镜像 tag。重新构建同一 tag 后，必须强制重建容器才能让线上换到新的 image ID：

```bash
ssh -i /Users/dongjiming/software/tencent-cloud/dongjiming.pem root@1.94.98.151

cd /opt/program/lobehub-build

docker build \
  --build-arg USE_CN_MIRROR=true \
  -t lobehub/lobehub:yuxiaohuan-favicon-20260726 \
  .
```

最近构建变快的原因：

- Docker 依赖层已经有缓存。
- 构建上下文变小了，不再把 `.next`、`node_modules`、`dist` 等本地缓存产物混入构建目录。
- 只要 `package.json`、`pnpm-workspace.yaml`、`packages` 依赖结构没有大变化，依赖安装层通常可以复用。

### 4. 发布前检查新镜像

确认镜像里没有错误的 Logo URL：

```bash
docker run --rm --entrypoint /bin/sh lobehub/lobehub:yuxiaohuan-favicon-20260726 -c \
  "grep -R -F '/https://static.cyan.zj.cn/cyan-logo.png' /app/public/_spa /app/public/_spa-auth 2>/dev/null || true"
```

如果没有输出，说明没有 `/https://...` 的错误路径。

如果改过 favicon，可额外检查：

```bash
cid=$(docker create lobehub/lobehub:yuxiaohuan-favicon-20260726)
tmp=$(mktemp -d)
docker cp "$cid:/app/public/favicon.ico" "$tmp/favicon.ico"
docker rm "$cid"
file "$tmp/favicon.ico"
rm -rf "$tmp"
```

### 5. 确认生产 compose 使用镜像模式

进入生产目录：

```bash
cd /opt/program/lobehub
```

`lobe` 服务镜像应为：

```yaml
services:
  lobe:
    image: lobehub/lobehub:yuxiaohuan-favicon-20260726
```

不要添加 `/app` volume。确认没有这个挂载，且旧产物目录不存在：

```bash
grep -n '/opt/program/lobe-app:/app' docker-compose.yml && echo '错误：不要发布' || echo 'OK'
test ! -e /opt/program/lobe-app && echo 'lobe-app absent'
```

检查 compose 语法：

```bash
docker compose config >/tmp/lobehub-compose-check.yml
```

### 6. 只重建应用服务

只重建 `lobe`，不要重启数据库、Redis、RustFS：

```bash
docker compose up -d --no-deps --force-recreate lobe
```

同一 tag 重新构建后，必须使用 `--force-recreate`。

### 7. 发布后验证

确认容器镜像和挂载：

```bash
docker image inspect lobehub/lobehub:yuxiaohuan-favicon-20260726 --format '{{.Id}} {{.Created}}'
docker inspect lobehub --format 'Image={{.Image}} Mounts={{json .Mounts}}'
docker ps --filter name=lobehub --format 'table {{.Names}}\t{{.Status}}'
```

`Mounts` 应该是 `[]`。

查看启动日志：

```bash
docker logs --tail=80 lobehub
```

应看到类似：

```text
✅ database migration pass.
✓ Ready
✅ Gateway: Started successfully.
```

从本机验证网页和图标：

```bash
curl -sSIL --max-time 20 https://lobe.cyan.zj.cn | sed -n '1,20p'
curl -sSIL --max-time 20 https://lobe.cyan.zj.cn/favicon.ico | sed -n '1,20p'
```

### 8. 回滚

如果新版本异常，先查本机或服务器是否保留了上一版镜像 ID。确认后把 compose 的 `lobe.image` 改成可回滚的旧 tag，或重新构建旧代码版本，再执行：

```bash
cd /opt/program/lobehub
docker compose up -d --no-deps --force-recreate lobe
docker logs --tail=80 lobehub
```

### 9. 常见注意事项

- 不要使用 `/opt/program/lobe-app:/app` volume 挂载。
- 不要直接在生产目录 `/opt/program/lobehub` 里构建源码；生产目录只放 compose、`.env` 和数据相关文件。
- 构建目录 `/opt/program/lobehub-build` 可以删除 `node_modules`、`.next`、`dist`、`public/_spa` 等缓存产物，但通常不需要手动清理。
- 如果只改静态图标，也仍然建议构建新镜像发布，保持线上内容和镜像标签一致。
- 构建日志中的 QStash token 和 Better Auth secret 警告是现有构建期警告；只要最终镜像构建成功、容器启动正常，就不阻塞本次品牌/前端发布。
