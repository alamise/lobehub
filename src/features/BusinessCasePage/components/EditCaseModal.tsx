'use client';

import { SaveOutlined } from '@ant-design/icons';
import { Form, Input, Modal } from 'antd';
import { memo } from 'react';

import type { CaseArchiveItem, ManagedArchiveUpsertPayload } from '../api';

interface EditFormState extends ManagedArchiveUpsertPayload {
  oss_hit_first_path?: string;
}

interface EditCaseModalProps {
  editing: boolean;
  form: EditFormState;
  onCancel: () => void;
  onChange: (form: EditFormState) => void;
  onOk: () => void;
  open: boolean;
  selectedArchive: CaseArchiveItem | null;
}

const EditCaseModal = memo(
  ({ editing, form, onCancel, onChange, onOk, open, selectedArchive }: EditCaseModalProps) => {
    return (
      <Modal
        cancelText="取消"
        confirmLoading={editing}
        destroyOnClose
        okButtonProps={{ icon: <SaveOutlined /> }}
        okText="保存"
        open={open}
        title={selectedArchive ? `编辑案卷：${selectedArchive.title || selectedArchive.id}` : '编辑案卷'}
        width={800}
        onCancel={onCancel}
        onOk={() => void onOk()}
      >
        <Form layout="vertical" className="pt-2">
          <Form.Item label="标题" required>
            <Input
              onChange={(event) => onChange({ ...form, title: event.target.value })}
              placeholder="请输入案卷标题"
              value={form.title}
            />
          </Form.Item>
          <div className="grid grid-cols-1 gap-x-4 gap-y-0 sm:grid-cols-2">
            <Form.Item label="文号">
              <Input
                onChange={(event) => onChange({ ...form, doc_no: event.target.value })}
                placeholder="请输入文号"
                value={form.doc_no}
              />
            </Form.Item>
            <Form.Item label="年度">
              <Input
                onChange={(event) => onChange({ ...form, year: event.target.value })}
                placeholder="如 2026"
                value={form.year}
              />
            </Form.Item>
            <Form.Item label="分类编码">
              <Input
                onChange={(event) => onChange({ ...form, category_code: event.target.value })}
                placeholder="请输入分类编码"
                value={form.category_code}
              />
            </Form.Item>
            <Form.Item label="责任人">
              <Input
                onChange={(event) => onChange({ ...form, responsible_party: event.target.value })}
                placeholder="请输入责任人"
                value={form.responsible_party}
              />
            </Form.Item>
            <Form.Item className="sm:col-span-2" label="部门名称">
              <Input
                onChange={(event) => onChange({ ...form, dept_name: event.target.value })}
                placeholder="请输入部门名称"
                value={form.dept_name}
              />
            </Form.Item>
            <Form.Item className="sm:col-span-2" label="备注">
              <Input.TextArea
                onChange={(event) => onChange({ ...form, remarks: event.target.value })}
                placeholder="补充说明"
                rows={4}
                value={form.remarks}
              />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    );
  },
);

EditCaseModal.displayName = 'EditCaseModal';

export default EditCaseModal;
