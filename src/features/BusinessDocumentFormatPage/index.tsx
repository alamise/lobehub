'use client';

import { Button, Card, Typography, Upload, message } from 'antd';
import { FileTextOutlined, InboxOutlined } from '@ant-design/icons';
import { FileText } from 'lucide-react';
import { memo, useState } from 'react';

import { useSession } from '@/libs/better-auth/auth-client';

import { formatDocument } from './api';

import BusinessPageContainer from '@/features/BusinessPageContainer';

const { Dragger } = Upload;

const BusinessDocumentFormatPage = memo(() => {
  const { data: session } = useSession();
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);

  const beforeUpload = (f: File) => {
    if (!f.name.toLowerCase().endsWith('.docx')) {
      message.error('仅支持 .docx 格式文档');
      return Upload.LIST_IGNORE;
    }
    setFile(f);
    return false; // 阻止自动上传，由按钮触发
  };

  const handleFormat = async () => {
    if (!file) {
      message.warning('请先上传 .docx 文件');
      return;
    }
    setProcessing(true);
    try {
      const blob = await formatDocument(file, session);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name.replace(/\.docx$/i, '') + '_formatted.docx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      message.success('格式化完成，文档已开始下载');
    } catch (e) {
      message.error(e instanceof Error ? e.message : '格式化失败');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
          <FileText size={22} />
        </div>
        <div>
          <Typography.Title className="!mb-0" level={3}>
            公文格式调整
          </Typography.Title>
          <Typography.Text type="secondary">上传 .docx，一键套用党政机关公文格式并导出</Typography.Text>
        </div>
      </div>

      <Card bordered={false} className="shadow-sm">
        <Dragger
          accept=".docx"
          beforeUpload={beforeUpload}
          fileList={file ? [{ name: file.name, size: file.size, uid: '-1', status: 'done' } as never] : []}
          maxCount={1}
          onRemove={() => setFile(null)}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">点击或拖拽 .docx 文件到此处</p>
          <p className="ant-upload-hint">仅支持 Word 2007+（.docx）格式</p>
        </Dragger>

        <div className="mt-4">
          <Button
            icon={<FileTextOutlined />}
            loading={processing}
            onClick={handleFormat}
            type="primary"
          >
            智能格式化并导出
          </Button>
          {file && (
            <Typography.Text className="ml-3" type="secondary">
              已选择：{file.name}
            </Typography.Text>
          )}
        </div>

        <Typography.Paragraph className="mt-4" type="secondary">
          说明：系统将按标题 / 一 / 二 / 三级标题与正文分级套用字体、字号、行距，设置页边距，并在奇偶页脚插入页码后导出。
        </Typography.Paragraph>
      </Card>
    </div>
  );
});

BusinessDocumentFormatPage.displayName = 'BusinessDocumentFormatPage';

const BusinessDocumentFormatPageWithContainer = memo(() => (
  <BusinessPageContainer>
    <BusinessDocumentFormatPage />
  </BusinessPageContainer>
));

BusinessDocumentFormatPageWithContainer.displayName = 'BusinessDocumentFormatPageWithContainer';

export default BusinessDocumentFormatPageWithContainer;
