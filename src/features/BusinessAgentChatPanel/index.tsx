'use client';

import { DeleteOutlined, MessageOutlined, SendOutlined } from '@ant-design/icons';
import type { BusinessAgentContext } from '@lobechat/types';
import { Button } from '@lobehub/ui/base-ui';
import { Empty, Input, Spin, Typography } from 'antd';
import { createStaticStyles, cx } from 'antd-style';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';

import { agentRuntimeClient } from '@/services/agentRuntime/client';
import { aiAgentService } from '@/services/aiAgent';

type BusinessAgentKind = BusinessAgentContext['kind'];

interface ChatRecord {
  answer: string;
  error?: string;
  id: string;
  operationId?: string;
  question: string;
  status: 'running' | 'completed' | 'failed';
  timestamp: number;
  topicId?: string;
}

interface BusinessAgentChatPanelProps {
  agentId?: string;
  contextId: string;
  disabledReason?: string;
  guideQuestions?: string[];
  kind: BusinessAgentKind;
  placeholder: string;
  title: string;
}

const styles = createStaticStyles(({ css }) => ({
  answer: css`
    margin-block-start: 10px;
    padding: 12px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;

    color: #334155;

    background: #f8fafc;

    .markdown-body,
    .markdown-body p {
      margin: 0;
      font-size: 13px;
      line-height: 1.7;
    }
  `,
  container: css`
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 12px;

    min-height: 0;
  `,
  empty: css`
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: center;

    min-height: 180px;
    border: 1px dashed #cbd5e1;
    border-radius: 10px;

    background: #fff;
  `,
  footer: css`
    flex: none;
  `,
  guideList: css`
    display: grid;
    flex: none;
    gap: 8px;
  `,
  guideButton: css`
    justify-content: flex-start;
    height: auto;
    padding-block: 8px;
    white-space: normal;
  `,
  header: css`
    display: flex;
    flex: none;
    align-items: center;
    justify-content: space-between;
  `,
  history: css`
    overflow: auto;
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 12px;

    min-height: 0;
  `,
  record: css`
    padding: 12px;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    background: #fff;
  `,
  recordFailed: css`
    border-color: #fecaca;
    background: #fff7f7;
  `,
  question: css`
    font-size: 13px;
    font-weight: 700;
    color: #0f172a;
    white-space: pre-wrap;
  `,
  status: css`
    margin-block-start: 8px;
    font-size: 12px;
    color: #64748b;
  `,
}));

const STORAGE_PREFIX = 'business-agent-chat';
const TOPIC_PREFIX = 'business-agent-topic';

const buildStorageKey = (kind: BusinessAgentKind, contextId: string) =>
  `${STORAGE_PREFIX}:${kind}:${contextId}`;

const buildTopicKey = (kind: BusinessAgentKind, contextId: string) =>
  `${TOPIC_PREFIX}:${kind}:${contextId}`;

const buildBusinessContext = (
  kind: BusinessAgentKind,
  contextId: string,
): BusinessAgentContext | undefined => {
  if (!contextId) return undefined;

  return kind === 'archive'
    ? { archiveId: contextId, kind: 'archive' }
    : { enterpriseId: contextId, kind: 'enterprise' };
};

const readJson = <T,>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') return fallback;

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const writeJson = (key: string, value: unknown) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify(value));
};

const removeItem = (key: string) => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(key);
};

const updateRecord = (
  records: ChatRecord[],
  id: string,
  patch: Partial<ChatRecord> | ((record: ChatRecord) => Partial<ChatRecord>),
) =>
  records.map((record) =>
    record.id === id
      ? {
          ...record,
          ...(typeof patch === 'function' ? patch(record) : patch),
        }
      : record,
  );

const BusinessAgentChatPanel = memo<BusinessAgentChatPanelProps>(
  ({ agentId, contextId, disabledReason, guideQuestions = [], kind, placeholder, title }) => {
    const [input, setInput] = useState('');
    const [records, setRecords] = useState<ChatRecord[]>([]);
    const [running, setRunning] = useState(false);
    const streamRef = useRef<AbortController | null>(null);

    const storageKey = useMemo(() => buildStorageKey(kind, contextId), [contextId, kind]);
    const topicKey = useMemo(() => buildTopicKey(kind, contextId), [contextId, kind]);
    const canSend = Boolean(agentId && contextId && input.trim() && !running);

    useEffect(() => {
      streamRef.current?.abort();
      streamRef.current = null;
      setRunning(false);
      setInput('');
      setRecords(readJson<ChatRecord[]>(storageKey, []));
    }, [storageKey]);

    useEffect(() => {
      writeJson(storageKey, records);
    }, [records, storageKey]);

    useEffect(
      () => () => {
        streamRef.current?.abort();
      },
      [],
    );

    const handleClear = useCallback(() => {
      streamRef.current?.abort();
      streamRef.current = null;
      setRunning(false);
      setRecords([]);
      removeItem(storageKey);
      removeItem(topicKey);
    }, [storageKey, topicKey]);

    const handleSend = useCallback(
      async (question?: string) => {
        const prompt = (question ?? input).trim();
        if (!agentId || !contextId || !prompt || running) return;

        const businessContext = buildBusinessContext(kind, contextId);
        if (!businessContext) return;

        const recordId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        setInput('');
        setRunning(true);
        setRecords((current) => [
          ...current,
          {
            answer: '',
            id: recordId,
            question: prompt,
            status: 'running',
            timestamp: Date.now(),
          },
        ]);

        try {
          const topicId =
            typeof window === 'undefined' ? undefined : window.localStorage.getItem(topicKey);
          const result = await aiAgentService.execAgentTask({
            agentId,
            appContext: {
              businessContext,
              scope: `business_${kind}`,
              topicId: topicId || undefined,
            },
            prompt,
          });

          if (result.topicId && typeof window !== 'undefined') {
            window.localStorage.setItem(topicKey, result.topicId);
          }

          setRecords((current) =>
            updateRecord(current, recordId, {
              operationId: result.operationId,
              topicId: result.topicId,
            }),
          );

          streamRef.current?.abort();
          streamRef.current = agentRuntimeClient.createStreamConnection(result.operationId, {
            includeHistory: true,
            onError: (error) => {
              setRunning(false);
              setRecords((current) =>
                updateRecord(current, recordId, {
                  error: error.message,
                  status: 'failed',
                }),
              );
            },
            onEvent: (event) => {
              if (event.type === 'stream_chunk' && typeof event.data?.content === 'string') {
                setRecords((current) =>
                  updateRecord(current, recordId, (record) => ({
                    answer: `${record.answer}${event.data.content}`,
                  })),
                );
                return;
              }

              if (event.type === 'stream_end') {
                const finalContent =
                  typeof event.data?.finalContent === 'string' ? event.data.finalContent : '';
                if (finalContent) {
                  setRecords((current) =>
                    updateRecord(current, recordId, {
                      answer: finalContent,
                    }),
                  );
                }
                return;
              }

              if (event.type === 'agent_runtime_end') {
                setRunning(false);
                setRecords((current) =>
                  updateRecord(current, recordId, (record) => ({
                    answer: record.answer || '已完成，本次回答内容可在该 Agent 会话中查看。',
                    status: 'completed',
                  })),
                );
                streamRef.current?.abort();
                streamRef.current = null;
                return;
              }

              if (event.type === 'error') {
                setRunning(false);
                setRecords((current) =>
                  updateRecord(current, recordId, {
                    error: event.data?.message || '问答执行失败',
                    status: 'failed',
                  }),
                );
              }
            },
          });
        } catch (error) {
          setRunning(false);
          setRecords((current) =>
            updateRecord(current, recordId, {
              error: error instanceof Error ? error.message : '问答启动失败',
              status: 'failed',
            }),
          );
        }
      },
      [agentId, contextId, input, kind, running, topicKey],
    );

    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <Typography.Text strong>{title}</Typography.Text>
          <Button
            disabled={records.length === 0 && !running}
            icon={<DeleteOutlined />}
            size="small"
            onClick={handleClear}
          >
            清空
          </Button>
        </div>

        {disabledReason ? (
          <div className={styles.empty}>
            <Empty description={disabledReason} image={Empty.PRESENTED_IMAGE_SIMPLE} />
          </div>
        ) : !agentId ? (
          <div className={styles.empty}>
            <Empty description="未配置共享 Agent ID" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          </div>
        ) : (
          <>
            {guideQuestions.length > 0 && (
              <div className={styles.guideList}>
                {guideQuestions.slice(0, 4).map((question) => (
                  <Button
                    className={styles.guideButton}
                    disabled={running}
                    key={question}
                    onClick={() => handleSend(question)}
                  >
                    {question}
                  </Button>
                ))}
              </div>
            )}

            <div className={styles.history}>
              {records.length === 0 ? (
                <div className={styles.empty}>
                  <Empty
                    description="暂无问答记录"
                    image={<MessageOutlined style={{ color: '#94a3b8', fontSize: 32 }} />}
                  />
                </div>
              ) : (
                records.map((record) => (
                  <div
                    className={cx(styles.record, record.status === 'failed' && styles.recordFailed)}
                    key={record.id}
                  >
                    <div className={styles.question}>{record.question}</div>
                    {record.status === 'running' && !record.answer ? (
                      <div className={styles.status}>
                        <Spin size="small" /> 正在思考...
                      </div>
                    ) : record.error ? (
                      <div className={styles.status}>{record.error}</div>
                    ) : (
                      <div className={styles.answer}>
                        <div className="markdown-body">
                          <ReactMarkdown>{record.answer}</ReactMarkdown>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className={styles.footer}>
              <Input.TextArea
                autoSize={{ maxRows: 4, minRows: 3 }}
                disabled={running}
                placeholder={placeholder}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onPressEnter={(event) => {
                  if (event.shiftKey) return;
                  event.preventDefault();
                  void handleSend();
                }}
              />
              <Button
                disabled={!canSend}
                icon={<SendOutlined />}
                loading={running}
                style={{ marginTop: 10, width: '100%' }}
                type="primary"
                onClick={() => handleSend()}
              >
                发送
              </Button>
            </div>
          </>
        )}
      </div>
    );
  },
);

BusinessAgentChatPanel.displayName = 'BusinessAgentChatPanel';

export default BusinessAgentChatPanel;
