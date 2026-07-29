'use client';

import { InboxOutlined } from '@ant-design/icons';
import { Modal, Typography, Upload, message } from 'antd';
import type { UploadFile } from 'antd';
import { memo, useState } from 'react';

import { CASE_UPLOAD_MAX_FILE_SIZE } from '../constants';

interface UploadCaseModalProps {
  authToken?: string | null;
  onSuccess: () => Promise<void>;
  open: boolean;
  setOpen: (open: boolean) => void;
  uploadCaseArchive: (file: File, authToken?: string | null) => Promise<unknown>;
}

const validateCasePDF = (file: File) => {
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  if (!isPdf) {
    message.error('仅支持上传 PDF 文件');
    return Upload.LIST_IGNORE;
  }
  if (file.size > CASE_UPLOAD_MAX_FILE_SIZE) {
    message.error('PDF 文件大小不能超过 200MB');
    return Upload.LIST_IGNORE;
  }
  return true;
};

const UploadCaseModal = memo(
  ({ authToken, onSuccess, open, setOpen, uploadCaseArchive }: UploadCaseModalProps) => {
    const [fileList, setFileList] = useState<UploadFile[]>([]);
    const [uploading, setUploading] = useState(false);

    const handleUpload = async () => {
      const file = fileList[0]?.originFileObj;
      if (!file) {
        message.error('请选择案卷 PDF 文件');
        return;
      }

      setUploading(true);
      try {
        await uploadCaseArchive(file, authToken);
        message.success('案卷上传成功，后台处理已启动');
        setFileList([]);
        setOpen(false);
        await onSuccess();
      } catch (error) {
        message.error(error instanceof Error ? error.message : '案卷上传失败');
      } finally {
        setUploading(false);
      }
    };

    const handleCancel = () => {
      setOpen(false);
      setFileList([]);
    };

    return (
      <Modal
        cancelText="取消"
        confirmLoading={uploading}
        destroyOnClose
        okButtonProps={{ disabled: fileList.length === 0 }}
        okText="开始上传"
        open={open}
        title="上传案卷"
        onCancel={handleCancel}
        onOk={() => void handleUpload()}
      >
        <Upload.Dragger
          accept=".pdf,application/pdf"
          beforeUpload={validateCasePDF}
          fileList={fileList}
          maxCount={1}
          multiple={false}
          onChange={({ fileList: nextFileList }) => setFileList(nextFileList.slice(-1))}
          onRemove={() => setFileList([])}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined className="text-4xl text-emerald-500" />
          </p>
          <p className="ant-upload-text">点击或拖拽 PDF 文件到此处上传</p>
          <p className="ant-upload-hint">
            仅支持单个 PDF 文件，大小不超过 200MB；上传完成后会自动入库并启动后台处理。
          </p>
        </Upload.Dragger>

        <Typography.Text type="secondary" className="mt-4 block text-xs">
          支持的文件格式：.pdf；后台将自动完成拆分、OCR、入库等处理流程。
        </Typography.Text>
      </Modal>
    );
  },
);

UploadCaseModal.displayName = 'UploadCaseModal';

export default UploadCaseModal;
