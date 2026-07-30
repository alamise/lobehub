'use client';

import { ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { Button } from '@lobehub/ui/base-ui';
import { Card, Input, message, Pagination, Space, Typography } from 'antd';
import { Building2 } from 'lucide-react';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';

import BusinessPageContainer from '@/features/BusinessPageContainer';
import { useUrlPage } from '@/hooks/useUrlPage';
import { useSession } from '@/libs/better-auth/auth-client';

import { type EnterpriseSummary, getEnterprises } from './api';
import { EnterpriseTable } from './components';
import { PAGE_SIZE } from './constants';

const BusinessEnterprisePage = memo(() => {
  const navigate = useNavigate();
  const { data: session, isPending } = useSession();
  const authToken = useMemo(
    () => (session as { accessToken?: string } | null | undefined)?.accessToken ?? null,
    [session],
  );

  const [search, setSearch] = useState('');
  const [keyword, setKeyword] = useState('');
  const [size, setSize] = useState(PAGE_SIZE);
  const [page, setPage] = useUrlPage();
  const [total, setTotal] = useState(0);
  const [enterprises, setEnterprises] = useState<EnterpriseSummary[]>([]);
  const [loading, setLoading] = useState(false);

  const loadEnterprises = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getEnterprises({
        authToken,
        page,
        search: keyword || undefined,
        size,
      });
      setEnterprises(result.list || []);
      setTotal(result.total || 0);
    } catch (error) {
      setEnterprises([]);
      setTotal(0);
      message.error(error instanceof Error ? error.message : '企业列表加载失败');
    } finally {
      setLoading(false);
    }
  }, [authToken, keyword, page, size]);

  useEffect(() => {
    if (isPending) return;
    void loadEnterprises();
  }, [isPending, loadEnterprises]);

  const handleSearch = () => {
    setPage(1);
    setKeyword(search.trim());
  };

  const handleClear = () => {
    setSearch('');
    setKeyword('');
    setPage(1);
  };

  const openDetail = (id: number) => {
    navigate(`/enforcement/company/${id}`);
  };

  if (isPending) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-500">
        正在加载企业页面...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
          <Building2 size={22} />
        </div>
        <div>
          <Typography.Title className="!mb-0" level={3}>
            AI 企业
          </Typography.Title>
          <Typography.Text type="secondary">企业列表独立管理与档案入口</Typography.Text>
        </div>
      </div>

      <Card bordered={false} className="shadow-sm">
        <div className="space-y-4">
          <Space wrap>
            <Input
              allowClear
              placeholder="按企业名称搜索"
              prefix={<SearchOutlined />}
              style={{ width: 280 }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onPressEnter={handleSearch}
            />
            <Button icon={<SearchOutlined />} type="primary" onClick={handleSearch}>
              搜索
            </Button>
            <Button onClick={handleClear}>清空</Button>
            <Button icon={<ReloadOutlined />} loading={loading} onClick={loadEnterprises}>
              刷新
            </Button>
          </Space>

          <EnterpriseTable enterprises={enterprises} loading={loading} onDetail={openDetail} />

          <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
            <Typography.Text type="secondary">共 {total} 条记录</Typography.Text>
            <Pagination
              showSizeChanger
              current={page}
              disabled={loading}
              pageSize={size}
              pageSizeOptions={[10, 20, 50, 100]}
              total={total}
              onChange={(nextPage, nextSize) => {
                if (nextSize !== size) {
                  setSize(nextSize);
                  setPage(1);
                } else {
                  setPage(nextPage);
                }
              }}
            />
          </div>
        </div>
      </Card>
    </div>
  );
});

BusinessEnterprisePage.displayName = 'BusinessEnterprisePage';

const BusinessEnterprisePageWithContainer = memo(() => (
  <BusinessPageContainer>
    <BusinessEnterprisePage />
  </BusinessPageContainer>
));

BusinessEnterprisePageWithContainer.displayName = 'BusinessEnterprisePageWithContainer';

export default BusinessEnterprisePageWithContainer;
