/**
 * 服务端 DOCX 生成（替代旧前端 docx 库的 exportAssessmentRecords）。
 * 直接产出最小可用的 WordprocessingML 包，避免引入新的前端依赖。
 */

import JSZip from 'jszip';

const escapeXml = (input: string): string =>
  (input || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');

export interface DocxParagraph {
  align?: 'left' | 'center';
  bold?: boolean;
  size?: number; // 单位：磅
  spacingAfter?: number; // 单位：二十分之一磅
  text: string;
  thematicBreak?: boolean;
}

const renderParagraph = (paragraph: DocxParagraph): string => {
  const sizeHalfPoints = Math.round((paragraph.size || 10.5) * 2);
  const props: string[] = [];
  if (paragraph.align === 'center') props.push('<w:jc w:val="center"/>');
  props.push(
    `<w:spacing w:after="${paragraph.spacingAfter ?? 120}" w:line="360" w:lineRule="auto"/>`,
  );
  if (paragraph.thematicBreak) {
    props.push('<w:pBdr><w:top w:val="single" w:sz="6" w:space="1" w:color="auto"/></w:pBdr>');
  }
  const runProps = `<w:rPr><w:rFonts w:ascii="SimSun" w:eastAsia="SimSun" w:hAnsi="SimSun"/>${
    paragraph.bold ? '<w:b/><w:bCs/>' : ''
  }<w:sz w:val="${sizeHalfPoints}"/><w:szCs w:val="${sizeHalfPoints}"/></w:rPr>`;
  return `<w:p><w:pPr>${props.join('')}</w:pPr><w:r>${runProps}<w:t xml:space="preserve">${escapeXml(
    paragraph.text,
  )}</w:t></w:r></w:p>`;
};

export const buildDocx = async (paragraphs: DocxParagraph[]): Promise<Buffer> => {
  const zip = new JSZip();

  zip.file(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`,
  );

  zip.folder('_rels')!.file(
    '.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`,
  );

  const body = paragraphs.map((paragraph) => renderParagraph(paragraph)).join('');
  zip.folder('word')!.file(
    'document.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1418" w:right="1418" w:bottom="1418" w:left="1418" w:header="851" w:footer="992" w:gutter="0"/></w:sectPr></w:body>
</w:document>`,
  );

  return zip.generateAsync({ compression: 'DEFLATE', type: 'nodebuffer' });
};
