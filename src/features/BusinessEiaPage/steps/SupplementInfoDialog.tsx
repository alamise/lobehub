'use client';

import { Button, Modal } from '@lobehub/ui/base-ui';
import { Input } from 'antd';
import { memo, useState } from 'react';

import { C } from '../theme';

/**
 * C11 补充信息弹窗：1:1 复刻旧 `SupplementInfoDialog.tsx`
 * 触发器为 link 样式的「补充信息」，弹窗内 8 行文本域，底部「取消 / 确定」。
 */
interface SupplementInfoDialogProps {
  description: string;
  onChange: (value: string) => void;
  placeholder: string;
  readOnly?: boolean;
  title: string;
  value: string;
}

const SupplementInfoDialog = memo<SupplementInfoDialogProps>(
  ({ title, description, value, placeholder, readOnly = false, onChange }) => {
    const [open, setOpen] = useState(false);
    const [draftValue, setDraftValue] = useState(value);

    return (
      <>
        <Button
          style={{ height: 'auto', padding: 0 }}
          type="link"
          onClick={() => {
            setDraftValue(value);
            setOpen(true);
          }}
        >
          补充信息
        </Button>
        <Modal
          open={open}
          title={title}
          width={672}
          footer={[
            <Button key="cancel" onClick={() => setOpen(false)}>
              取消
            </Button>,
            <Button
              key="ok"
              type="primary"
              onClick={() => {
                onChange(draftValue);
                setOpen(false);
              }}
            >
              确定
            </Button>,
          ]}
          onCancel={() => setOpen(false)}
        >
          <div style={{ color: C.slate500, fontSize: 14, marginBottom: 12 }}>{description}</div>
          <Input.TextArea
            placeholder={placeholder}
            readOnly={readOnly}
            rows={8}
            value={draftValue}
            style={{
              background: C.white,
              borderColor: C.slate200,
              borderRadius: 16,
              lineHeight: '28px',
              padding: '12px 16px',
            }}
            onChange={(event) => setDraftValue(event.target.value)}
          />
        </Modal>
      </>
    );
  },
);

SupplementInfoDialog.displayName = 'SupplementInfoDialog';

export default SupplementInfoDialog;
