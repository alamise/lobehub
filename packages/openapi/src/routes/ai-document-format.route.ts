import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';

import { requireLobeSession } from './legacyDb';
import { formatDocx } from './docxFormat';

const AiDocumentFormatRoutes = new Hono();

AiDocumentFormatRoutes.use('*', requireLobeSession);

AiDocumentFormatRoutes.post('/', async (c) => {
  let body: Record<string, unknown>;
  try {
    body = (await c.req.parseBody({ all: true })) as Record<string, unknown>;
  } catch {
    throw new HTTPException(400, { message: '无法解析上传的文件' });
  }

  const file = body.file as File | undefined;
  if (!file) throw new HTTPException(400, { message: '请上传 .docx 文件' });

  const name = file.name || 'document.docx';
  if (!name.toLowerCase().endsWith('.docx')) {
    throw new HTTPException(400, { message: '仅支持 .docx 格式文档' });
  }

  let buffer: Buffer;
  try {
    const ab = await file.arrayBuffer();
    buffer = Buffer.from(ab);
  } catch {
    throw new HTTPException(400, { message: '读取上传文件失败' });
  }
  if (buffer.byteLength < 4) {
    throw new HTTPException(400, { message: '文件内容为空' });
  }

  let formatted: Buffer;
  try {
    formatted = await formatDocx(buffer);
  } catch (err) {
    const msg = err instanceof Error ? err.message : '文档格式化失败';
    throw new HTTPException(500, { message: msg });
  }

  const outName = name.replace(/\.docx$/i, '') + '_formatted.docx';
  const encoded = encodeURIComponent(outName);

  return new Response(formatted, {
    status: 200,
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename*=UTF-8''${encoded}`,
      'Cache-Control': 'no-store',
    },
  });
});

export default AiDocumentFormatRoutes;
