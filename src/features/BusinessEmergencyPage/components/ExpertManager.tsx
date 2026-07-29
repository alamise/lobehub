'use client';

import {
  Button,
  Form,
  Input,
  Modal,
  Pagination,
  Popconfirm,
  Select,
  Space,
  Table,
  message,
} from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { memo, useCallback, useEffect, useState } from 'react';

import { useUrlPage } from '@/hooks/useUrlPage';

import {
  createExpert,
  deleteExpert,
  getExperts,
  updateExpert,
  type EmergencyExpert,
} from '../api';
import { PAGE_SIZE } from '../constants';

const EXPERT_STATUS_OPTIONS = [
  { label: '可调用', value: '可调用' },
  { label: '外出', value: '外出' },
  { label: '休假', value: '休假' },
];

const ExpertManager = memo(() => {
  const [items, setItems] = useState<EmergencyExpert[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useUrlPage('expert_page');
  const [size, setSize] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [keyword, setKeyword] = useState('');
  const [majorDraft, setMajorDraft] = useState('');
  const [availableStatusDraft, setAvailableStatusDraft] = useState('');
  const [major, setMajor] = useState('');
  const [availableStatus, setAvailableStatus] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<EmergencyExpert | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getExperts({
        page,
        query: keyword || undefined,
        major: major || undefined,
        available_status: availableStatus || undefined,
        size,
      });
      setItems(result.list || []);
      setTotal(result.total || 0);
    } catch (error) {
      setItems([]);
      setTotal(0);
      message.error(error instanceof Error ? error.message : '专家列表加载失败');
    } finally {
      setLoading(false);
    }
  }, [keyword, page, size, major, availableStatus]);

  useEffect(() => {
    void load();
  }, [load]);

  const commitFilters = () => {
    setMajor(majorDraft.trim());
    setAvailableStatus(availableStatusDraft);
    setKeyword(query.trim());
    setPage(1);
  };

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (record: EmergencyExpert) => {
    setEditing(record);
    form.setFieldsValue(record);
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      if (editing?.id) {
        await updateExpert(editing.id, values);
        message.success('专家已更新');
      } else {
        await createExpert(values);
        message.success('专家已新增');
      }
      setModalOpen(false);
      setPage(1);
      await load();
    } catch (error) {
      if (error instanceof Error) message.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (record: EmergencyExpert) => {
    try {
      await deleteExpert(record.id);
      message.success('专家已删除');
      await load();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '删除失败');
    }
  };

  const columns: ColumnsType<EmergencyExpert> = [
    { dataIndex: 'id', title: 'ID', width: 80, render: (v: number) => v },
    { dataIndex: 'name', title: '姓名', width: 120, render: (v: string) => v || '—' },
    { dataIndex: 'gender', title: '性别', width: 80, render: (v: string) => v || '—' },
    { dataIndex: 'title', title: '职称', width: 120, render: (v: string) => v || '—' },
    { dataIndex: 'major', title: '专业方向', width: 140, render: (v: string) => v || '—' },
    { dataIndex: 'unit', title: '工作单位', width: 160, render: (v: string) => v || '—' },
    { dataIndex: 'expert_type', title: '专家类型', width: 120, render: (v: string) => v || '—' },
    { dataIndex: 'position', title: '职务', width: 120, render: (v: string) => v || '—' },
    { dataIndex: 'contact_phone', title: '联系电话', width: 130, render: (v: string) => v || '—' },
    { dataIndex: 'available_status', title: '状态', width: 90, render: (v: string) => v || '—' },
    {
      title: '操作',
      width: 120,
      render: (_, row) => (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => openEdit(row)} size="small" type="link">
            编辑
          </Button>
          <Popconfirm
            cancelText="取消"
            okButtonProps={{ danger: true }}
            okText="删除"
            onConfirm={() => handleDelete(row)}
            title="确认删除该专家？"
          >
            <Button danger icon={<DeleteOutlined />} size="small" type="link" />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <Space wrap>
        <Input
          allowClear
          onChange={(e) => setQuery(e.target.value)}
          onPressEnter={commitFilters}
          placeholder="搜索姓名 / 单位 / 专业"
          prefix={<SearchOutlined />}
          style={{ width: 260 }}
          value={query}
        />
        <Input
          allowClear
          onChange={(e) => setMajorDraft(e.target.value)}
          onPressEnter={commitFilters}
          placeholder="专业方向"
          style={{ width: 160 }}
          value={majorDraft}
        />
        <Select
          allowClear
          onChange={(v) => {
            setAvailableStatusDraft(v || '');
            setAvailableStatus(v || '');
            setPage(1);
          }}
          options={EXPERT_STATUS_OPTIONS}
          placeholder="可调用状态"
          style={{ width: 140 }}
          value={availableStatusDraft || undefined}
        />
        <Button icon={<SearchOutlined />} onClick={commitFilters} type="primary">
          搜索
        </Button>
        <Button icon={<PlusOutlined />} onClick={openCreate} type="primary">
          新增专家
        </Button>
        <Button icon={<ReloadOutlined />} loading={loading} onClick={load}>
          刷新
        </Button>
      </Space>

      <Table<EmergencyExpert>
        columns={columns}
        dataSource={items}
        loading={loading}
        pagination={false}
        rowKey="id"
        scroll={{ x: 1200 }}
        size="middle"
      />

      <div className="flex justify-end">
        <Pagination
          current={page}
          disabled={loading}
          onChange={(nextPage, nextSize) => {
            if (nextSize !== size) {
              setSize(nextSize);
              setPage(1);
            } else {
              setPage(nextPage);
            }
          }}
          pageSize={size}
          pageSizeOptions={[10, 20, 50, 100]}
          showSizeChanger
          total={total}
        />
      </div>

      <Modal
        destroyOnClose
        onCancel={() => setModalOpen(false)}
        onOk={handleSave}
        confirmLoading={saving}
        open={modalOpen}
        title={editing ? '编辑专家' : '新增专家'}
        width={560}
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Space size="large" style={{ display: 'flex' }}>
            <Form.Item label="姓名" name="name" rules={[{ required: true, message: '请输入姓名' }]}>
              <Input />
            </Form.Item>
            <Form.Item label="性别" name="gender">
              <Input placeholder="男 / 女" />
            </Form.Item>
          </Space>
          <Space size="large" style={{ display: 'flex' }}>
            <Form.Item label="职称" name="title">
              <Input placeholder="如：高级工程师" />
            </Form.Item>
            <Form.Item label="专业" name="major">
              <Input placeholder="如：环境工程" />
            </Form.Item>
          </Space>
          <Space size="large" style={{ display: 'flex' }}>
            <Form.Item label="单位" name="unit">
              <Input />
            </Form.Item>
            <Form.Item label="职务" name="position">
              <Input />
            </Form.Item>
          </Space>
          <Space size="large" style={{ display: 'flex' }}>
            <Form.Item label="联系电话" name="contact_phone">
              <Input />
            </Form.Item>
            <Form.Item label="专家类型" name="expert_type">
              <Input placeholder="如：应急 / 技术" />
            </Form.Item>
          </Space>
          <Form.Item label="可用状态" name="available_status">
            <Input placeholder="如：在岗 / 待命" />
          </Form.Item>
          <Form.Item label="备注" name="remark">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
});

export default ExpertManager;
