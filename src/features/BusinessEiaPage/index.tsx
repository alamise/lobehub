'use client';

import { Button } from '@lobehub/ui/base-ui';
import { Input, message } from 'antd';
import { Download, Plus, Search, Trash2 } from 'lucide-react';
import type { CSSProperties } from 'react';
import { memo, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';

import BusinessPageContainer from '@/features/BusinessPageContainer';
import { useSession } from '@/libs/better-auth/auth-client';

import { clearEia, deleteEia, exportEiaDocx, getEiaAuthToken, listEia } from './api';
import type { AssessmentWorkflowRecord } from './shared';
import { getAssessmentRecordRoute } from './shared';
import { C, roseOutlineBtn } from './theme';

/**
 * C1 AI 环评记录列表页：1:1 复刻旧 `pages/approvals/AssessmentRecords.tsx`
 * 顶部标题/说明 + 「AI环评（新建）/ 导出 DOCX / 清空」三按钮，关键词搜索 + 总数，
 * 四列表格（时间 / 建设内容 / 状态 / 操作），操作列按完成状态展示「查看详情」或「继续判定」，外加「删除」。
 */
const BusinessEiaPage = memo(() => {
  const navigate = useNavigate();
  const { data: session } = useSession();
  const authToken = getEiaAuthToken(session);

  const [keyword, setKeyword] = useState('');
  const [records, setRecords] = useState<AssessmentWorkflowRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingRecordId, setDeletingRecordId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const result = await listEia({ authToken, page: 1, size: 200 });
        if (!cancelled) setRecords(Array.isArray(result?.list) ? result.list : []);
      } catch (error) {
        if (!cancelled) message.error(error instanceof Error ? error.message : '加载记录失败');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [authToken]);

  const filteredRecords = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    if (!normalizedKeyword) return records;
    return records.filter((record) =>
      `${record.steps.summary.content} ${record.completed ? '已完成' : '未完成'}`
        .toLowerCase()
        .includes(normalizedKeyword),
    );
  }, [keyword, records]);

  const handleDeleteRecord = async (record: AssessmentWorkflowRecord) => {
    if (deletingRecordId) return;
    if (!globalThis.confirm('确认删除该条环评判定记录吗？删除后不可恢复。')) return;
    try {
      setDeletingRecordId(record.id);
      await deleteEia(record.id, authToken);
      setRecords((current) => current.filter((item) => item.id !== record.id));
      message.success('记录已删除');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '删除失败');
    } finally {
      setDeletingRecordId(null);
    }
  };

  const handleExport = async () => {
    try {
      await exportEiaDocx(authToken);
      message.success('DOCX 已开始导出');
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'DOCX 导出失败');
    }
  };

  const handleClear = async () => {
    if (!globalThis.confirm('确认清空当前账号下的全部环评判定记录吗？')) return;
    try {
      await clearEia(authToken);
      setRecords([]);
      message.success('已清空记录');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '清空失败');
    }
  };

  const thStyle: CSSProperties = {
    color: C.slate500,
    fontSize: 12,
    fontWeight: 400,
    letterSpacing: '0.08em',
    padding: '12px 16px',
    textAlign: 'left',
    textTransform: 'uppercase',
  };
  const tdStyle: CSSProperties = {
    borderTop: `1px solid ${C.slate200}`,
    padding: '12px 16px',
    verticalAlign: 'top',
  };

  return (
    <BusinessPageContainer>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div
          style={{
            alignItems: 'center',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 16,
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ color: C.slate900, fontSize: 24, fontWeight: 600 }}>AI环评</div>
            <div style={{ color: C.slate500, fontSize: 14 }}>
              为建设项目环评审批提供流程化的智能辅助判定能力，支持历史记录检索、过程续办和结论回看。
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <Button icon={<Plus size={16} />} onClick={() => navigate('/approval/eia/new')}>
              AI环评
            </Button>
            <Button icon={<Download size={16} />} onClick={() => void handleExport()}>
              导出 DOCX
            </Button>
            <Button style={roseOutlineBtn} onClick={() => void handleClear()}>
              清空
            </Button>
          </div>
        </div>

        <div style={{ alignItems: 'center', display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <Input
              placeholder="搜索：建设内容 / 状态"
              prefix={<Search color={C.slate400} size={16} />}
              style={{ background: C.white, borderColor: C.slate200, borderRadius: 16, height: 44 }}
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
            />
          </div>
          <div style={{ color: C.slate500, fontSize: 14 }}>
            共 <span style={{ color: C.slate900, fontWeight: 600 }}>{records.length}</span> 条
          </div>
        </div>

        <div className="business-desktop-only">
          <div
            style={{
              background: C.white,
              border: `1px solid ${C.slate200}`,
              borderRadius: 12,
              overflow: 'hidden',
            }}
          >
            <div style={{ maxHeight: 'calc(100vh - 260px)', overflow: 'auto' }}>
              <table
                style={{
                  borderCollapse: 'collapse',
                  fontSize: 14,
                  minWidth: '100%',
                  width: '100%',
                }}
              >
                <colgroup>
                  <col style={{ width: 220 }} />
                  <col />
                  <col style={{ width: 140 }} />
                  <col style={{ width: 200 }} />
                </colgroup>
                <thead style={{ background: C.slate50, position: 'sticky', top: 0, zIndex: 10 }}>
                  <tr>
                    <th style={thStyle}>时间</th>
                    <th style={thStyle}>建设内容</th>
                    <th style={thStyle}>状态</th>
                    <th style={thStyle}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td
                        colSpan={4}
                        style={{
                          ...tdStyle,
                          color: C.slate500,
                          padding: '40px 16px',
                          textAlign: 'center',
                        }}
                      >
                        正在加载记录...
                      </td>
                    </tr>
                  ) : filteredRecords.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        style={{
                          ...tdStyle,
                          color: C.slate500,
                          padding: '40px 16px',
                          textAlign: 'center',
                        }}
                      >
                        暂无记录。新增环评判定并生成结果后，会自动沉淀到这里。
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((record) => (
                      <tr key={record.id}>
                        <td style={{ ...tdStyle, color: C.slate600, whiteSpace: 'nowrap' }}>
                          {new Date(record.updatedAt).toLocaleString('zh-CN')}
                        </td>
                        <td style={{ ...tdStyle, color: C.slate700, maxWidth: 0 }}>
                          <div
                            style={{
                              display: '-webkit-box',
                              lineHeight: '24px',
                              overflow: 'hidden',
                              WebkitBoxOrient: 'vertical',
                              WebkitLineClamp: 2,
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-all',
                            }}
                          >
                            {record.steps.summary.content || '—'}
                          </div>
                        </td>
                        <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                          <span
                            style={{
                              background: record.completed ? C.emerald50 : C.amber50,
                              borderRadius: 9999,
                              color: record.completed ? C.emerald700 : C.amber700,
                              display: 'inline-flex',
                              fontSize: 12,
                              fontWeight: 500,
                              padding: '4px 10px',
                            }}
                          >
                            {record.completed ? '已完成' : '未完成'}
                          </span>
                        </td>
                        <td style={tdStyle}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {record.completed ? (
                              <Button
                                size="small"
                                onClick={() => navigate(getAssessmentRecordRoute(record))}
                              >
                                查看详情
                              </Button>
                            ) : (
                              <Button
                                size="small"
                                style={{ background: C.emerald600 }}
                                type="primary"
                                onClick={() => navigate(getAssessmentRecordRoute(record))}
                              >
                                继续判定
                              </Button>
                            )}
                            <Button
                              disabled={deletingRecordId === record.id}
                              icon={<Trash2 size={14} />}
                              size="small"
                              style={roseOutlineBtn}
                              onClick={() => void handleDeleteRecord(record)}
                            >
                              {deletingRecordId === record.id ? '删除中...' : '删除'}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="business-mobile-only">
          <div style={{ display: 'grid', gap: 12 }}>
            {loading ? (
              <div className="rounded-xl border border-slate-100 bg-white p-4 text-center text-sm text-slate-500">
                正在加载记录...
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="rounded-xl border border-slate-100 bg-white p-4 text-center text-sm text-slate-500">
                暂无记录。新增环评判定并生成结果后，会自动沉淀到这里。
              </div>
            ) : (
              filteredRecords.map((record) => (
                <div
                  className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm"
                  key={record.id}
                >
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
                    <span style={{ color: C.slate500, fontSize: 12 }}>
                      {new Date(record.updatedAt).toLocaleString('zh-CN')}
                    </span>
                    <span
                      style={{
                        background: record.completed ? C.emerald50 : C.amber50,
                        borderRadius: 9999,
                        color: record.completed ? C.emerald700 : C.amber700,
                        display: 'inline-flex',
                        flex: 'none',
                        fontSize: 12,
                        fontWeight: 500,
                        padding: '4px 10px',
                      }}
                    >
                      {record.completed ? '已完成' : '未完成'}
                    </span>
                  </div>
                  <div
                    style={{
                      color: C.slate700,
                      lineHeight: '22px',
                      marginTop: 10,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all',
                    }}
                  >
                    {record.steps.summary.content || '—'}
                  </div>
                  <div style={{ display: 'grid', gap: 8, marginTop: 14 }}>
                    <Button
                      size="small"
                      style={record.completed ? undefined : { background: C.emerald600 }}
                      type={record.completed ? 'default' : 'primary'}
                      onClick={() => navigate(getAssessmentRecordRoute(record))}
                    >
                      {record.completed ? '查看详情' : '继续判定'}
                    </Button>
                    <Button
                      disabled={deletingRecordId === record.id}
                      icon={<Trash2 size={14} />}
                      size="small"
                      style={roseOutlineBtn}
                      onClick={() => void handleDeleteRecord(record)}
                    >
                      {deletingRecordId === record.id ? '删除中...' : '删除'}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </BusinessPageContainer>
  );
});

BusinessEiaPage.displayName = 'BusinessEiaPage';

export default BusinessEiaPage;
