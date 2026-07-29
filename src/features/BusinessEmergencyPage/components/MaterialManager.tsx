'use client';

import {
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Pagination,
  Popconfirm,
  Select,
  Space,
  Table,
  Typography,
  message,
} from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { memo, useCallback, useEffect, useState } from 'react';

import { useUrlPage } from '@/hooks/useUrlPage';

import {
  createMaterial,
  deleteMaterial,
  getMaterials,
  updateMaterial,
  type EmergencyMaterial,
} from '../api';
import { PAGE_SIZE } from '../constants';

const MATERIAL_STATUS_OPTIONS = [
  { label: '可用', value: '可用' },
  { label: '维修中', value: '维修中' },
  { label: '报废', value: '报废' },
];

const MaterialManager = memo(() => {
  const [items, setItems] = useState<EmergencyMaterial[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useUrlPage('material_page');
  const [size, setSize] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [keyword, setKeyword] = useState('');
  const [categoryDraft, setCategoryDraft] = useState('');
  const [usableStatusDraft, setUsableStatusDraft] = useState('');
  const [category, setCategory] = useState('');
  const [usableStatus, setUsableStatus] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<EmergencyMaterial | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getMaterials({
        page,
        query: keyword || undefined,
        category: category || undefined,
        usable_status: usableStatus || undefined,
        size,
      });
      setItems(result.list || []);
      setTotal(result.total || 0);
    } catch (error) {
      setItems([]);
      setTotal(0);
      message.error(error instanceof Error ? error.message : '物资列表加载失败');
    } finally {
      setLoading(false);
    }
  }, [keyword, page, size, category, usableStatus]);

  useEffect(() => {
    void load();
  }, [load]);

  const commitFilters = () => {
    setCategory(categoryDraft.trim());
    setUsableStatus(usableStatusDraft);
    setKeyword(query.trim());
    setPage(1);
  };

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (record: EmergencyMaterial) => {
    setEditing(record);
    form.setFieldsValue(record);
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      if (editing?.id) {
        await updateMaterial(editing.id, values);
        message.success('物资已更新');
      } else {
        await createMaterial(values);
        message.success('物资已新增');
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

  const handleDelete = async (record: EmergencyMaterial) => {
    try {
      await deleteMaterial(record.id);
      message.success('物资已删除');
      await load();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '删除失败');
    }
  };

  const columns: ColumnsType<EmergencyMaterial> = [
    { dataIndex: 'id', title: 'ID', width: 80, render: (v: number) => v },
    { dataIndex: 'material_name', title: '物资名称', render: (v: string) => v || '—' },
    { dataIndex: 'category', title: '类别', width: 120, render: (v: string) => v || '—' },
    { dataIndex: 'specification', title: '规格', width: 140, render: (v: string) => v || '—' },
    { dataIndex: 'stock_num', title: '库存', width: 90, render: (v: number) => v ?? 0 },
    { dataIndex: 'unit', title: '单位', width: 80, render: (v: string) => v || '—' },
    { dataIndex: 'storage_location', title: '存储位置', width: 140, render: (v: string) => v || '—' },
    { dataIndex: 'contact_person', title: '联系人', width: 100, render: (v: string) => v || '—' },
    { dataIndex: 'contact_phone', title: '联系电话', width: 130, render: (v: string) => v || '—' },
    { dataIndex: 'usable_status', title: '状态', width: 90, render: (v: string) => v || '—' },
    { dataIndex: 'expire_date', title: '有效期', width: 120, render: (v: string) => v || '—' },
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
            title="确认删除该物资？"
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
          placeholder="搜索物资名称 / 联系人"
          prefix={<SearchOutlined />}
          style={{ width: 260 }}
          value={query}
        />
        <Input
          allowClear
          onChange={(e) => setCategoryDraft(e.target.value)}
          onPressEnter={commitFilters}
          placeholder="物资类别"
          style={{ width: 160 }}
          value={categoryDraft}
        />
        <Select
          allowClear
          onChange={(v) => {
            setUsableStatusDraft(v || '');
            setUsableStatus(v || '');
            setPage(1);
          }}
          options={MATERIAL_STATUS_OPTIONS}
          placeholder="可用状态"
          style={{ width: 140 }}
          value={usableStatusDraft || undefined}
        />
        <Button icon={<SearchOutlined />} onClick={commitFilters} type="primary">
          搜索
        </Button>
        <Button icon={<PlusOutlined />} onClick={openCreate} type="primary">
          新增物资
        </Button>
        <Button icon={<ReloadOutlined />} loading={loading} onClick={load}>
          刷新
        </Button>
      </Space>

      <Table<EmergencyMaterial>
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
        title={editing ? '编辑物资' : '新增物资'}
        width={560}
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item
            label="物资名称"
            name="material_name"
            rules={[{ required: true, message: '请输入物资名称' }]}
          >
            <Input placeholder="请输入物资名称" />
          </Form.Item>
          <Space size="large" style={{ display: 'flex' }}>
            <Form.Item label="类别" name="category">
              <Input placeholder="如：防护装备" />
            </Form.Item>
            <Form.Item label="规格" name="specification">
              <Input placeholder="如：50套/箱" />
            </Form.Item>
          </Space>
          <Space size="large" style={{ display: 'flex' }}>
            <Form.Item label="库存数量" name="stock_num">
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item label="单位" name="unit">
              <Input placeholder="如：套" />
            </Form.Item>
          </Space>
          <Form.Item label="存储位置" name="storage_location">
            <Input placeholder="如：应急仓库 A 区" />
          </Form.Item>
          <Space size="large" style={{ display: 'flex' }}>
            <Form.Item label="联系人" name="contact_person">
              <Input />
            </Form.Item>
            <Form.Item label="联系电话" name="contact_phone">
              <Input />
            </Form.Item>
          </Space>
          <Form.Item label="可用状态" name="usable_status">
            <Input placeholder="如：可用 / 待补充" />
          </Form.Item>
          <Form.Item label="过期日期" name="expire_date">
            <Input placeholder="如：2027-01-01" />
          </Form.Item>
          <Form.Item label="备注" name="remark">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
});

export default MaterialManager;
