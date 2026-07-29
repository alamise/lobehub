'use client';

import { Card, Pagination, Typography, message } from 'antd';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';

import { useUrlPage } from '@/hooks/useUrlPage';
import { useSession } from '@/libs/better-auth/auth-client';

import {
  deleteCaseArchive,
  getCaseArchives,
  retryCaseArchiveProcess,
  updateCaseArchive,
  uploadCaseArchive,
  type CaseArchiveItem,
  type ManagedArchiveUpsertPayload,
} from './api';
import {
  CaseArchiveTable,
  EditCaseModal,
  HeaderStats,
  SearchToolbar,
  UploadCaseModal,
} from './components';
import { PAGE_SIZE } from './constants';

import BusinessPageContainer from '@/features/BusinessPageContainer';

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

const BusinessCasePage = memo(() => {
  const navigate = useNavigate();
  const { data: session, isPending } = useSession();
  const authToken = useMemo(
    () => ((session as { accessToken?: string } | null | undefined)?.accessToken ?? null),
    [session],
  );

  const [search, setSearch] = useState('');
  const [keyword, setKeyword] = useState('');
  const [size, setSize] = useState(PAGE_SIZE);
  const [page, setPage] = useUrlPage();
  const [total, setTotal] = useState(0);
  const [archives, setArchives] = useState<CaseArchiveItem[]>([]);
  const [loading, setLoading] = useState(false);

  const [uploadOpen, setUploadOpen] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [selectedArchive, setSelectedArchive] = useState<CaseArchiveItem | null>(null);
  const [editForm, setEditForm] = useState<EditFormState>(defaultEditForm);

  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [retryingId, setRetryingId] = useState<number | null>(null);

  const loadArchives = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getCaseArchives({
        authToken,
        page,
        search: keyword || undefined,
        size,
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
  }, [authToken, keyword, page, size]);

  useEffect(() => {
    if (isPending) return;
    void loadArchives();
  }, [isPending, loadArchives]);

  const handleSearch = () => {
    setPage(1);
    setKeyword(search.trim());
  };

  const openDetail = (archiveId: number) => {
    navigate(`/enforcement/case/${archiveId}`);
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

  const handleUploadSuccess = async () => {
    setPage(1);
    await loadArchives();
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
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-500">
        正在加载案卷页面...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <HeaderStats archives={archives} total={total} />

      <Card bordered={false} className="shadow-sm">
        <div className="space-y-4">
          <SearchToolbar
            loading={loading}
            onRefresh={loadArchives}
            onSearch={handleSearch}
            onUpload={() => setUploadOpen(true)}
            search={search}
            setSearch={setSearch}
          />

          <CaseArchiveTable
            archives={archives}
            deletingId={deletingId}
            loading={loading}
            onDelete={handleDelete}
            onDetail={openDetail}
            onEdit={openEditDialog}
            onLogCenter={openLogCenter}
            onRetry={handleRetry}
            retryingId={retryingId}
          />

          <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
            <Typography.Text type="secondary">共 {total} 条记录</Typography.Text>
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
        </div>
      </Card>

      <UploadCaseModal
        authToken={authToken}
        onSuccess={handleUploadSuccess}
        open={uploadOpen}
        setOpen={setUploadOpen}
        uploadCaseArchive={uploadCaseArchive}
      />

      <EditCaseModal
        editing={editing}
        form={editForm}
        onCancel={() => {
          setEditOpen(false);
          setSelectedArchive(null);
        }}
        onChange={setEditForm}
        onOk={handleUpdate}
        open={editOpen}
        selectedArchive={selectedArchive}
      />

    </div>
  );
});

BusinessCasePage.displayName = 'BusinessCasePage';

const BusinessCasePageWithContainer = memo(() => (
  <BusinessPageContainer>
    <BusinessCasePage />
  </BusinessPageContainer>
));

BusinessCasePageWithContainer.displayName = 'BusinessCasePageWithContainer';

export default BusinessCasePageWithContainer;
