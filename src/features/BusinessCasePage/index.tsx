'use client';

import { Button, Form, Input, Modal, Popconfirm, Space, Table, Tag, Typography, message } from 'antd';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';

import { useSession } from '@/libs/better-auth/auth-client';

import {
  deleteCaseArchive,
  getCaseArchive,
  getCaseArchives,
  retryCaseArchiveProcess,
  updateCaseArchive,
  uploadCaseArchive,
  type CaseArchiveItem,
  type ManagedArchiveUpsertPayload,
} from './api';

const PAGE_SIZE = 10;
const CASE_UPLOAD_MAX_FILE_SIZE = 200 * 1024 * 1024;

type EditFormState = ManagedArchiveUpsertPayload & {
  oss_hit_first_path?: string;
};

const defaultEditForm: EditFormState = {
  annex_name: '',
  category_code: '',
  dept_name: '',
  doc_no: '',
  oss_hit_first_path: '',
  page_count: 0,
  remarks: '',
  responsible_party: '',
  title: '',
  year: '',
};

const getProcessStatusMeta = (status?: string) => {
  switch (status) {
    case 'completed':
      return { color: 'green', label: '已完成' };
    case 'splitting':
      return { color: 'gold', label: '拆分中' };
    case 'ocr_processing':
      return { color: 'blue', label: 'OCR中' };
    case 'indexing':
      return { color: 'geekblue', label: '入库中' };
    case 'failed':
      return { color: 'red', label: '失败' };
    case 'error':
    case 'abnormal':
      return { color: 'red', label: '异常' };
    default:
      return { color: 'default', label: '待处理' };
  }
};

const validateCasePDF = (file: File | null) => {
  if (!file) return '请选择案卷 PDF 文件';
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  if (!isPdf) return '仅支持上传 PDF 文件';
  if (file.size > CASE_UPLOAD_MAX_FILE_SIZE) return 'PDF 文件大小不能超过 200MB';
  return '';
};

const BusinessCasePage = memo(() => {
  const navigate = useNavigate();
  const { data: session, isPending } = useSession();
  const authToken = useMemo(
    () => ((session as { accessToken?: string } | null | undefined)?.accessToken ?? null),
    [session],
  );

  const [search, setSearch] = useState('');
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [archives, setArchives] = useState<CaseArchiveItem[]>([]);
  const [loading, setLoading] = useState(false);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [selectedArchive, setSelectedArchive] = useState<CaseArchiveItem | null>(null);
  const [editForm, setEditForm] = useState<EditFormState>(defaultEditForm);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailArchive, setDetailArchive] = useState<CaseArchiveItem | null>(null);

  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [retryingId, setRetryingId] = useState<number | null>(null);

  const loadArchives = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getCaseArchives({
        authToken,
        page,
        search: keyword || undefined,
        size: PAGE_SIZE,
      });
      setArchives(result.list || []);
      setTotal(result.total || 0);
    } catch (error) {
      setArchives([]);
      setTotal(0);
      message.error(error instanceof Error ? error.message : '案卷列表加载失败');
    } finally {
      setLoading(false);
    }
  }, [authToken, keyword, page]);

  useEffect(() => {
    if (isPending) return;
    void loadArchives();
  }, [isPending, loadArchives]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleSearch = () => {
    setPage(1);
    setKeyword(search.trim());
  };

  const openDetail = async (archiveId: number) => {
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      const data = await getCaseArchive(archiveId, authToken);
      setDetailArchive(data);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '案卷详情加载失败');
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const openEditDialog = (archive: CaseArchiveItem) => {
    setSelectedArchive(archive);
    setEditForm({
      annex_name: archive.annex_name || '',
      category_code: archive.category_code || '',
      dept_name: archive.dept_name || '',
      doc_no: archive.doc_no || '',
      oss_hit_first_path: archive.pdf_url || '',
      page_count: archive.page_count || 0,
      remarks: archive.remarks || '',
      responsible_party: archive.responsible_party || '',
      title: archive.title || '',
      year: archive.year || '',
    });
    setEditOpen(true);
  };

  const resetUpload = () => {
    setUploadFile(null);
    setUploading(false);
  };

  const handleUpload = async () => {
    const validationMessage = validateCasePDF(uploadFile);
    if (validationMessage) {
      message.error(validationMessage);
      return;
    }

    setUploading(true);
    try {
      await uploadCaseArchive(uploadFile!, authToken);
      message.success('案卷上传成功，后台处理已启动');
      setUploadOpen(false);
      resetUpload();
      setPage(1);
      await loadArchives();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '案卷上传失败');
    } finally {
      setUploading(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedArchive?.id) return;
    if (!editForm.title.trim()) {
      message.error('案卷标题不能为空');
      return;
    }

    setEditing(true);
    try {
      await updateCaseArchive(
        selectedArchive.id,
        {
          annex_name: editForm.annex_name,
          category_code: editForm.category_code,
          dept_name: editForm.dept_name,
          doc_no: editForm.doc_no,
          oss_hit_first_path: editForm.oss_hit_first_path,
          page_count: editForm.page_count,
          remarks: editForm.remarks,
          responsible_party: editForm.responsible_party,
          title: editForm.title.trim(),
          year: editForm.year,
        },
        authToken,
      );
      message.success('案卷已更新');
      setEditOpen(false);
      setSelectedArchive(null);
      await loadArchives();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '案卷更新失败');
    } finally {
      setEditing(false);
    }
  };

  const handleDelete = async (archive: CaseArchiveItem) => {
    setDeletingId(archive.id);
    try {
      await deleteCaseArchive(archive.id, authToken);
      message.success('案卷已删除');
      if (archives.length === 1 && page > 1) {
        setPage((prev) => prev - 1);
      } else {
        await loadArchives();
      }
    } catch (error) {
      message.error(error instanceof Error ? error.message : '案卷删除失败');
    } finally {
      setDeletingId(null);
    }
  };

  const handleRetry = async (archive: CaseArchiveItem) => {
    setRetryingId(archive.id);
    try {
      await retryCaseArchiveProcess(archive.id, authToken);
      message.success('案卷重新处理已启动，将从失败节点继续执行');
      await loadArchives();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '重新处理失败');
    } finally {
      setRetryingId(null);
    }
  };

  const openLogCenter = (archiveId: number) => {
    navigate(`/settings/log-center?task_id=${archiveId}&keyword=case_process`);
  };

  if (isPending) {
    return <div className="flex h-full items-center justify-center text-sm text-slate-500">正在加载案卷页面...</div>;
  }

  const columns = [
    { dataIndex: 'id', title: '档案ID', width: 110 },
    {
      dataIndex: 'title',
      render: (_: string, record: CaseArchiveItem) => (
        <button
          className="max-w-full truncate text-left text-emerald-700 hover:underline"
          onClick={() => void openDetail(record.id)}
          type="button"
        >
          {record.title || '-'}
        </button>
      ),
      title: '标题',
    },
    { dataIndex: 'page_count', title: '页数', width: 90 },
    {
      dataIndex: 'process_status',
      render: (value: string) => {
        const meta = getProcessStatusMeta(value);
        return <Tag color={meta.color}>{meta.label}</Tag>;
      },
      title: '处理状态',
      width: 120,
    },
    {
      key: 'actions',
      render: (_: unknown, record: CaseArchiveItem) => {
        const retryable = ['failed', 'error', 'abnormal'].includes(record.process_status || '');
        return (
          <Space size={8} wrap>
            <Button size="small" onClick={() => void openDetail(record.id)}>
              查看详情
            </Button>
            <Button size="small" onClick={() => openEditDialog(record)}>
              编辑
            </Button>
            <Button size="small" onClick={() => openLogCenter(record.id)}>
              查看处理日志
            </Button>
            {retryable ? (
              <Button
                loading={retryingId === record.id}
                size="small"
                onClick={() => void handleRetry(record)}
              >
                重新处理
              </Button>
            ) : null}
            <Popconfirm
              cancelText="取消"
              okButtonProps={{ danger: true, loading: deletingId === record.id }}
              okText="确认删除"
              onConfirm={() => void handleDelete(record)}
              title="删除后该案卷将不再出现在列表中，是否继续？"
            >
              <Button danger size="small">
                删除
              </Button>
            </Popconfirm>
          </Space>
        );
      },
      title: '操作',
      width: 360,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <Typography.Title level={3} className="!mb-1">
          AI 案卷
        </Typography.Title>
        <Typography.Text type="secondary">案卷上传、处理状态追踪与处理日志查看</Typography.Text>
      </div>

      <div className="space-y-4">
        <Space wrap>
          <Input
            allowClear
            onChange={(event) => setSearch(event.target.value)}
            onPressEnter={handleSearch}
            placeholder="搜索标题 / 文号"
            value={search}
            style={{ width: 320 }}
          />
          <Button onClick={handleSearch}>搜索</Button>
          <Button onClick={() => void loadArchives()}>刷新</Button>
          <Button
            type="primary"
            onClick={() => {
              resetUpload();
              setUploadOpen(true);
            }}
          >
            上传新案卷
          </Button>
        </Space>

        <Table columns={columns as any} dataSource={archives} loading={loading} pagination={false} rowKey="id" scroll={{ x: 980 }} />

        <div className="flex items-center justify-between text-sm text-slate-600">
          <div>共 {total} 条记录</div>
          <Space>
            <Button disabled={page <= 1} onClick={() => setPage((prev) => prev - 1)}>
              上一页
            </Button>
            <span>
              第 {page} / {totalPages} 页
            </span>
            <Button disabled={page >= totalPages} onClick={() => setPage((prev) => prev + 1)}>
              下一页
            </Button>
          </Space>
        </div>
      </div>

      <Modal
        cancelText="取消"
        confirmLoading={uploading}
        okText="开始上传"
        open={uploadOpen}
        title="上传案卷"
        onCancel={() => setUploadOpen(false)}
        onOk={() => void handleUpload()}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Input
            accept=".pdf,application/pdf"
            onChange={(event) => setUploadFile(event.target.files?.[0] || null)}
            type="file"
          />
          {uploadFile ? <div>已选择：{uploadFile.name}</div> : null}
          <Typography.Text type="secondary">
            仅支持单个 PDF，上传完成后会自动入库并启动后台处理。
          </Typography.Text>
        </Space>
      </Modal>

      <Modal
        cancelText="取消"
        confirmLoading={editing}
        okText="保存"
        open={editOpen}
        title="编辑案卷"
        width={800}
        onCancel={() => setEditOpen(false)}
        onOk={() => void handleUpdate()}
      >
        <Form layout="vertical">
          <Form.Item label="标题" required>
            <Input
              onChange={(event) => setEditForm((prev) => ({ ...prev, title: event.target.value }))}
              value={editForm.title}
            />
          </Form.Item>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item label="文号">
              <Input
                onChange={(event) => setEditForm((prev) => ({ ...prev, doc_no: event.target.value }))}
                value={editForm.doc_no}
              />
            </Form.Item>
            <Form.Item label="年度">
              <Input
                onChange={(event) => setEditForm((prev) => ({ ...prev, year: event.target.value }))}
                value={editForm.year}
              />
            </Form.Item>
            <Form.Item label="分类编码">
              <Input
                onChange={(event) => setEditForm((prev) => ({ ...prev, category_code: event.target.value }))}
                value={editForm.category_code}
              />
            </Form.Item>
            <Form.Item label="责任人">
              <Input
                onChange={(event) => setEditForm((prev) => ({ ...prev, responsible_party: event.target.value }))}
                value={editForm.responsible_party}
              />
            </Form.Item>
            <Form.Item className="col-span-2" label="部门名称">
              <Input
                onChange={(event) => setEditForm((prev) => ({ ...prev, dept_name: event.target.value }))}
                value={editForm.dept_name}
              />
            </Form.Item>
            <Form.Item className="col-span-2" label="备注">
              <Input.TextArea
                rows={4}
                onChange={(event) => setEditForm((prev) => ({ ...prev, remarks: event.target.value }))}
                value={editForm.remarks}
              />
            </Form.Item>
          </div>
        </Form>
      </Modal>

      <Modal footer={null} open={detailOpen} title="案卷详情" width={900} onCancel={() => setDetailOpen(false)}>
        {detailLoading ? (
          <div className="py-8 text-center text-slate-500">正在加载案卷详情...</div>
        ) : detailArchive ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>档案ID: {detailArchive.id}</div>
              <div>标题: {detailArchive.title || '-'}</div>
              <div>文号: {detailArchive.doc_no || '-'}</div>
              <div>年度: {detailArchive.year || '-'}</div>
              <div>页数: {detailArchive.page_count || 0}</div>
              <div>状态: {detailArchive.process_status || '-'}</div>
            </div>
            <pre className="max-h-[420px] overflow-auto rounded-lg bg-slate-50 p-4 text-xs leading-6 text-slate-700">
              {JSON.stringify(detailArchive, null, 2)}
            </pre>
          </div>
        ) : null}
      </Modal>
    </div>
  );
});

export default BusinessCasePage;
