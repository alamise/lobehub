import JSZip from 'jszip';

// 公文格式调整：在保留原文内容的前提下，对 docx 套用中国党政机关公文格式规范。
// 参考 legacy 的 office_formatting_service：标题/一/二/三级/正文分级字体、行距、
// 页边距、奇偶页不同页脚并插入 PAGE 域页码。

const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

const SZ_TITLE = 44; // 22pt 方正小标宋
const SZ_BODY = 32; // 16pt

const FONT_TITLE = 'FZXiaoBiaoSong-B05S'; // 方正小标宋_GBK
const FONT_HEI = 'SimHei'; // 黑体
const FONT_KAI = 'KaiTi'; // 楷体_GB2312
const FONT_FANG = 'FangSong'; // 仿宋_GB2312

const PG_MAR = 'w:top="1440" w:right="1800" w:bottom="1440" w:left="1800" w:header="720" w:footer="720" w:gutter="0"';

type Level = 'title' | 'level1' | 'level2' | 'level3' | 'body';

const decodeXml = (s: string): string =>
  s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');

const paraText = (pXml: string): string => {
  const texts: string[] = [];
  const re = /<w:t[^>]*>([\s\S]*?)<\/w:t>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(pXml))) texts.push(decodeXml(m[1]));
  return texts.join('');
};

const classify = (text: string): Level => {
  const t = text.trim();
  if (/^[一二三四五六七八九十百千]+、/.test(t)) return 'level1';
  if (/^（[一二三四五六七八九十百千]+）/.test(t)) return 'level2';
  if (/^\d+\.\s*/.test(t)) return 'level3';
  return 'body';
};

const fontProps = (
  level: Level,
): { font: string; sz: number; bold: boolean; center: boolean } => {
  switch (level) {
    case 'title':
      return { bold: true, center: true, font: FONT_TITLE, sz: SZ_TITLE };
    case 'level1':
      return { bold: true, center: false, font: FONT_HEI, sz: SZ_BODY };
    case 'level2':
      return { bold: false, center: false, font: FONT_KAI, sz: SZ_BODY };
    case 'level3':
      return { bold: true, center: false, font: FONT_FANG, sz: SZ_BODY };
    case 'body':
    default:
      return { bold: false, center: false, font: FONT_FANG, sz: SZ_BODY };
  }
};

const buildRPr = (font: string, sz: number, bold: boolean): string =>
  `<w:rPr><w:rFonts w:ascii="${font}" w:eastAsia="${font}" w:hAnsi="${font}" w:cs="${font}"/>` +
  (bold ? '<w:b/>' : '') +
  `<w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/></w:rPr>`;

// 给每个 w:r 注入/覆盖 rPr（字体 + 字号 + 加粗）
const applyRunProps = (xml: string, font: string, sz: number, bold: boolean): string => {
  const rPr = buildRPr(font, sz, bold);
  return xml.replace(/<w:r\b([^>]*)>([\s\S]*?)<\/w:r>/g, (_full, attrs: string, inner: string) => {
    const cleaned = inner.replace(/<w:rPr>[\s\S]*?<\/w:rPr>/, '');
    return `<w:r${attrs}>${rPr}${cleaned}</w:r>`;
  });
};

const transformParagraph = (block: string, isFirstContent: boolean): string => {
  const text = paraText(block).trim();
  if (!text) return block;

  const level: Level = isFirstContent ? 'title' : classify(text);
  const { font, sz, bold, center } = fontProps(level);
  const after = level === 'title' ? 570 : 0;

  const newPPr =
    `<w:pPr><w:jc w:val="${center ? 'center' : 'both'}"/>` +
    `<w:spacing w:after="${after}" w:line="570" w:lineRule="exact"/></w:pPr>`;

  // 去掉原 pPr 与 <w:p> 标签，仅保留内部 run
  let inner = block.replace(/<w:pPr[\s\S]*?<\/w:pPr>/, '');
  inner = inner.replace(/^<w:p\b[^>]*>/, '').replace(/<\/w:p>$/, '');

  const styled = applyRunProps(inner, font, sz, bold);
  return `<w:p>${newPPr}${styled}</w:p>`;
};

const buildFooter = (): string =>
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
  `<w:ftr xmlns:w="${W}" xmlns:r="${R}">` +
  `<w:p><w:pPr><w:jc w:val="center"/><w:rPr><w:rFonts w:ascii="宋体" w:eastAsia="宋体" w:hAnsi="宋体"/><w:sz w:val="28"/></w:rPr></w:pPr>` +
  `<w:r><w:fldSimple w:instr="PAGE"><w:r><w:rPr><w:rFonts w:ascii="宋体" w:eastAsia="宋体" w:hAnsi="宋体"/><w:sz w:val="28"/></w:rPr><w:t>1</w:t></w:r></w:fldSimple></w:r>` +
  `</w:p></w:ftr>`;

export const formatDocx = async (buffer: Buffer): Promise<Buffer> => {
  const zip = await JSZip.loadAsync(buffer);

  const docFile = zip.file('word/document.xml');
  if (!docFile) throw new Error('无效的 docx 文件：缺少 word/document.xml');
  let docXml = await docFile.async('string');

  // 分段处理段落
  const paraRe = /<w:p[\s>][\s\S]*?<\/w:p>/g;
  let m: RegExpExecArray | null;
  let firstContentSeen = false;
  const replacements: { from: string; to: string }[] = [];
  while ((m = paraRe.exec(docXml))) {
    const block = m[0];
    const text = paraText(block).trim();
    if (!text) continue;
    const transformed = transformParagraph(block, !firstContentSeen);
    firstContentSeen = true;
    replacements.push({ from: block, to: transformed });
  }
  for (const r of replacements) {
    // 用函数替换避免 $ 字符被当作替换模式解析
    docXml = docXml.replace(r.from, () => r.to);
  }

  // 确保 sectPr 存在并注入页边距 + 页脚引用
  let sectPr = '';
  const sectMatch = docXml.match(/<w:sectPr[\s>][\s\S]*?<\/w:sectPr>/);
  if (sectMatch) {
    sectPr = sectMatch[0];
  } else {
    sectPr = '<w:sectPr></w:sectPr>';
  }
  if (!/<w:pgMar\b/.test(sectPr)) {
    sectPr = sectPr.replace(/<w:sectPr([\s>])/, `<w:sectPr$1<w:pgMar ${PG_MAR}/>`);
  }
  if (!/footerReference/.test(sectPr)) {
    sectPr = sectPr.replace(
      /<w:sectPr([\s>])/,
      `<w:sectPr$1<w:footerReference w:type="default" r:id="rIdFooterDefault"/><w:footerReference w:type="even" r:id="rIdFooterEven"/>`,
    );
  }
  if (sectMatch) {
    docXml = docXml.replace(sectMatch[0], sectPr);
  } else {
    docXml = docXml.replace(/<\/w:body>/, `${sectPr}</w:body>`);
  }
  zip.file('word/document.xml', docXml);

  // 页脚文件
  zip.file('word/footer1.xml', buildFooter());
  zip.file('word/footer2.xml', buildFooter());

  // 更新 document.xml.rels（兼容完整与自闭合两种形式）
  const relsFile = zip.file('word/_rels/document.xml.rels');
  if (relsFile) {
    let rels = await relsFile.async('string');
    if (!/rIdFooterDefault/.test(rels)) {
      const relXml =
        `<Relationship Id="rIdFooterDefault" Type="${R}/footer" Target="footer1.xml"/>` +
        `<Relationship Id="rIdFooterEven" Type="${R}/footer" Target="footer2.xml"/>`;
      if (/<\/Relationships>/.test(rels)) {
        rels = rels.replace(/<\/Relationships>/, `${relXml}</Relationships>`);
      } else {
        rels = rels.replace(/<Relationships([^>]*)\/>/, `<Relationships$1>${relXml}</Relationships>`);
      }
      zip.file('word/_rels/document.xml.rels', rels);
    }
  }

  // settings.xml 启用奇偶页不同
  const settingsFile = zip.file('word/settings.xml');
  if (settingsFile) {
    let settings = await settingsFile.async('string');
    if (!/evenAndOddHeaders/.test(settings)) {
      settings = settings.replace(/(<w:settings\b[^>]*>)/, '$1<w:evenAndOddHeaders/>');
      zip.file('word/settings.xml', settings);
    }
  }

  return zip.generateAsync({
    type: 'nodebuffer',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    compression: 'DEFLATE',
  }) as unknown as Promise<Buffer>;
};
