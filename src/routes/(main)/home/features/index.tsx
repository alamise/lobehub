'use client';

import { Center, Flexbox, Icon, Text } from '@lobehub/ui';
import { Button } from '@lobehub/ui/base-ui';
import { createStaticStyles } from 'antd-style';
import {
  Bell,
  Building2,
  ClipboardList,
  Cloud,
  Database,
  FolderOpen,
  Landmark,
  type LucideIcon,
  Megaphone,
  Smartphone,
  User,
  Waves,
} from 'lucide-react';
import { memo } from 'react';

import { SHARED_AGENT_PATH } from '@/features/BusinessNavigation/config';
import ToggleLeftPanelButton from '@/features/NavPanel/ToggleLeftPanelButton';
import UserAvatar from '@/features/User/UserAvatar';
import { useWorkspaceAwareNavigate } from '@/features/Workspace/useWorkspaceAwareNavigate';
import { useUserStore } from '@/store/user';
import { userProfileSelectors } from '@/store/user/selectors';

const styles = createStaticStyles(({ css, cssVar }) => ({
  assistantAvatar: css`
    overflow: hidden;
    flex: none;

    width: 44px;
    height: 44px;
    border: 1px solid #d9e7ef;
    border-radius: 50%;

    background: #e8f7f3;
  `,
  assistantHeader: css`
    display: flex;
    align-items: center;
    justify-content: space-between;

    padding-block: 24px;
    padding-inline: 28px;
    border-radius: 20px 20px 0 0;

    color: #fff;

    background: linear-gradient(90deg, #19c186 0%, #0a9e58 100%);
  `,
  assistantPanel: css`
    overflow: hidden;
    border-radius: 20px;
    background: #fff;
    box-shadow: 0 18px 40px rgb(15 23 42 / 8%);
  `,
  bubbleAi: css`
    max-width: min(520px, 72%);
    padding-block: 18px;
    padding-inline: 22px;
    border: 1px solid #dbe6ee;
    border-radius: 18px 18px 18px 4px;

    font-size: 16px;
    font-weight: 600;
    color: #4b5b70;

    background: #fff;
    box-shadow: 0 6px 14px rgb(15 23 42 / 6%);
  `,
  bubbleUser: css`
    max-width: min(360px, 72%);
    padding-block: 18px;
    padding-inline: 26px;
    border-radius: 18px 18px 4px;

    font-size: 16px;
    font-weight: 700;
    color: #fff;

    background: #08a373;
  `,
  card: css`
    cursor: pointer;

    min-width: 0;
    min-height: 184px;
    padding-block: 28px;
    padding-inline: 22px;
    border: 1px solid #edf2f6;
    border-radius: 18px;

    text-align: center;

    background: rgb(255 255 255 / 92%);
    box-shadow: 0 8px 22px rgb(15 23 42 / 4%);

    transition:
      transform 0.18s ${cssVar.motionEaseOut},
      box-shadow 0.18s ${cssVar.motionEaseOut},
      border-color 0.18s ${cssVar.motionEaseOut};

    &:hover {
      transform: translateY(-4px);
      border-color: #ccefe3;
      box-shadow: 0 18px 38px rgb(8 163 115 / 12%);
    }
  `,
  cardGrid: css`
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 18px;
    max-width: 1240px;

    @media (width <= 1180px) {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    @media (width <= 720px) {
      grid-template-columns: 1fr;
    }
  `,
  cardIcon: css`
    width: 68px;
    height: 68px;
    margin-block: 0 18px;
    margin-inline: auto;
    border-radius: 16px;

    box-shadow: 0 10px 22px rgb(15 23 42 / 14%);
  `,
  metricBars: css`
    display: flex;
    flex: 1;
    gap: 5px;
    align-items: flex-end;
    justify-content: flex-end;

    height: 66px;
  `,
  metricCard: css`
    cursor: pointer;

    display: flex;
    flex-direction: column;
    justify-content: space-between;

    min-width: 0;
    min-height: 168px;
    padding-block: 26px;
    padding-inline: 28px;
    border: 1px solid #d9f0e7;
    border-radius: 18px;

    text-align: start;

    background: #fff;
    box-shadow: 0 7px 18px rgb(15 23 42 / 3%);

    transition:
      transform 0.18s ${cssVar.motionEaseOut},
      box-shadow 0.18s ${cssVar.motionEaseOut},
      border-color 0.18s ${cssVar.motionEaseOut};

    &:hover {
      transform: translateY(-3px);
      border-color: #bce9d8;
      box-shadow: 0 16px 34px rgb(8 163 115 / 10%);
    }
  `,
  metricGrid: css`
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 16px;

    @media (width <= 1120px) {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    @media (width <= 680px) {
      grid-template-columns: 1fr;
    }
  `,
  metricIcon: css`
    display: flex;
    flex: none;
    align-items: center;
    justify-content: center;

    width: 68px;
    height: 68px;
    border-radius: 16px;

    box-shadow: 0 11px 22px rgb(15 23 42 / 14%);
  `,
  metricLabel: css`
    margin-block-start: 2px;

    font-size: 16px;
    font-weight: 500;
    line-height: 1.2;
    color: #5f6f82;
  `,
  metricSection: css`
    margin-block-start: 54px;
    padding-block: 0 20px;
  `,
  metricSubtitle: css`
    margin-block: 10px 28px;

    font-size: 18px;
    font-weight: 500;
    color: #5e6b7c;
    text-align: center;
  `,
  metricTitle: css`
    margin: 0;

    font-size: 36px;
    font-weight: 900;
    line-height: 1.15;
    color: #162236;
    text-align: center;

    @media (width <= 680px) {
      font-size: 28px;
    }
  `,
  metricTop: css`
    display: flex;
    gap: 18px;
    align-items: flex-start;
    justify-content: space-between;
  `,
  metricValue: css`
    font-size: 56px;
    font-weight: 900;
    line-height: 0.95;
    color: #10172a;
    text-align: end;

    @media (width <= 680px) {
      font-size: 42px;
    }
  `,
  page: css`
    min-height: 100%;
    color: #1f2a3a;
    background: #f6f9fc;
  `,
  shell: css`
    padding-block: 38px 56px;
    padding-inline: 40px;

    @media (width <= 900px) {
      padding-block: 24px 40px;
      padding-inline: 18px;
    }
  `,
  stage: css`
    position: relative;

    overflow: hidden;

    max-width: 1560px;
    margin-block: 0;
    margin-inline: auto;
    padding-block: 64px 44px;
    padding-inline: 42px;
    border-radius: 30px;

    background: #fff;
    box-shadow: 0 18px 50px rgb(15 23 42 / 4%);

    @media (width <= 900px) {
      padding-block: 36px 28px;
      padding-inline: 22px;
      border-radius: 22px;
    }
  `,
  topbar: css`
    display: flex;
    align-items: center;
    justify-content: space-between;

    height: 64px;
    padding-block: 0;
    padding-inline: 42px 26px;
    border-block-end: 1px solid #e7edf4;

    background: #fff;
    box-shadow: 0 2px 10px rgb(15 23 42 / 5%);
  `,
}));

interface MetricCard {
  bars?: number[];
  gradient: string;
  icon: LucideIcon;
  label: string;
  path: string;
  suffix?: string;
  value: number;
}

const modules = [
  {
    accent: 'linear-gradient(135deg, #07819a 0%, #087b70 100%)',
    description: '非结构化文本+结构化数据',
    emphasis: '问答问数全覆盖',
    icon: Landmark,
    path: SHARED_AGENT_PATH,
    title: 'AI数字人',
  },
  {
    accent: 'linear-gradient(135deg, #16a96b 0%, #0b9f58 100%)',
    description: '分区前档案+分区后档案',
    emphasis: '历史档案全活用',
    icon: FolderOpen,
    path: '/enforcement/archive',
    title: 'AI档案',
  },
  {
    accent: 'linear-gradient(135deg, #097f74 0%, #e6a500 100%)',
    description: '审批+验收+许可+监管+处罚+信访',
    emphasis: '企业管理全周期',
    icon: Building2,
    path: '/enforcement/company',
    title: 'AI企业',
  },
  {
    accent: 'linear-gradient(135deg, #087fb0 0%, #06a2bd 100%)',
    description: '项目准入+环评类型智能判定',
    emphasis: '政策准入全覆盖',
    icon: ClipboardList,
    path: '/approval/eia',
    title: 'AI环评',
  },
];

const metrics: MetricCard[] = [
  {
    bars: [93, 100, 96, 84, 66, 50, 41, 42, 52, 69],
    gradient: 'linear-gradient(135deg, #10b981 0%, #0d9488 100%)',
    icon: Building2,
    label: '企业数',
    path: '/enforcement/company',
    value: 32705,
  },
  {
    gradient: 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)',
    icon: Cloud,
    label: '空气优良率',
    path: '/monitoring',
    suffix: '%',
    value: 94.4,
  },
  {
    gradient: 'linear-gradient(135deg, #0891b2 0%, #0f766e 100%)',
    icon: Waves,
    label: '水环境质量',
    path: '/monitoring',
    suffix: '%',
    value: 100,
  },
  {
    bars: [93, 100, 96, 84, 66, 50, 41, 42, 52, 69],
    gradient: 'linear-gradient(135deg, #6366f1 0%, #7c3aed 100%)',
    icon: ClipboardList,
    label: '案件数',
    path: '/enforcement/case',
    value: 697,
  },
  {
    bars: [82, 76, 68, 72, 65, 59, 61, 54, 48, 41],
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)',
    icon: Database,
    label: 'PM2.5',
    path: '/monitoring',
    value: 41.2,
  },
  {
    bars: [90, 99, 98, 87, 70, 53, 42, 41, 49, 65],
    gradient: 'linear-gradient(135deg, #ec4899 0%, #e11d48 100%)',
    icon: Megaphone,
    label: '信访数',
    path: '/decision/statistics',
    value: 491,
  },
];

const getDonutStyle = (percent: number) => {
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const normalized = Math.max(0, Math.min(100, percent));

  return {
    strokeDasharray: `${circumference} ${circumference}`,
    strokeDashoffset: circumference * (1 - normalized / 100),
  };
};

const Home = memo(() => {
  const navigate = useWorkspaceAwareNavigate();
  const [nickname, username] = useUserStore((s) => [
    userProfileSelectors.nickName(s),
    userProfileSelectors.username(s),
  ]);
  const displayName = nickname || username || 'admin';

  return (
    <div className={styles.page}>
      <header className={styles.topbar}>
        <Flexbox horizontal align="center" gap={18}>
          <ToggleLeftPanelButton forceVisible id={null} />
          <span
            style={{
              alignItems: 'center',
              borderRadius: 999,
              background: '#eef4f8',
              color: '#506174',
              display: 'inline-flex',
              fontSize: 14,
              fontWeight: 700,
              padding: '8px 18px',
            }}
          >
            杭州市生态环境局余杭分局
          </span>
        </Flexbox>
        <Flexbox horizontal align="center" gap={24}>
          <span style={{ display: 'inline-flex', position: 'relative' }}>
            <Icon color="#8da0b8" icon={Bell} size={22} />
            <span
              style={{
                background: '#ef4444',
                border: '2px solid #fff',
                borderRadius: '50%',
                height: 8,
                position: 'absolute',
                right: 1,
                top: 1,
                width: 8,
              }}
            />
          </span>
          <span style={{ height: 34, width: 1, background: '#e3eaf2' }} />
          <Text color="#27364b" weight={700}>
            {displayName}
          </Text>
          <UserAvatar nameOverride={displayName} size={36} />
        </Flexbox>
      </header>

      <main className={styles.shell}>
        <section className={styles.stage}>
          <Flexbox horizontal align="flex-start" gap={32} justify="space-between">
            <Flexbox flex={1} gap={34} style={{ minWidth: 0 }}>
              <div>
                <h1
                  style={{
                    background: 'linear-gradient(90deg, #097f68 0%, #13a760 52%, #0097bd 100%)',
                    WebkitBackgroundClip: 'text',
                    color: 'transparent',
                    fontSize: 'clamp(42px, 4vw, 58px)',
                    fontWeight: 900,
                    letterSpacing: 0,
                    lineHeight: 1.08,
                    margin: 0,
                  }}
                >
                  智慧环保 AI驱动未来
                </h1>
                <p
                  style={{
                    color: '#526176',
                    fontSize: 20,
                    fontWeight: 700,
                    lineHeight: 1.7,
                    margin: '18px 0 0',
                  }}
                >
                  以数据为基、以模型为核、以场景为翼 推进生态环境治理现代化
                </p>
              </div>

              <div className={styles.cardGrid}>
                {modules.map((module) => (
                  <button
                    className={styles.card}
                    key={module.title}
                    type="button"
                    onClick={() => navigate(module.path)}
                  >
                    <Center className={styles.cardIcon} style={{ background: module.accent }}>
                      <Icon color="#fff" icon={module.icon} size={32} />
                    </Center>
                    <h2 style={{ color: '#1d2737', fontSize: 22, fontWeight: 900, margin: 0 }}>
                      {module.title}
                    </h2>
                    <p
                      style={{
                        color: '#778295',
                        fontSize: 14,
                        fontWeight: 600,
                        margin: '14px 0 0',
                      }}
                    >
                      {module.description}
                    </p>
                    <p
                      style={{ color: '#05846e', fontSize: 16, fontWeight: 900, margin: '8px 0 0' }}
                    >
                      {module.emphasis}
                    </p>
                  </button>
                ))}
              </div>
            </Flexbox>

            <button
              aria-label="进入AI数字人"
              type="button"
              style={{
                alignSelf: 'stretch',
                background: 'transparent',
                border: 0,
                cursor: 'pointer',
                flex: '0 0 300px',
                padding: 0,
              }}
              onClick={() => navigate(SHARED_AGENT_PATH)}
            >
              <img
                alt="环保数字人"
                src="/hangxiaohuan-character.png"
                style={{
                  display: 'block',
                  height: 350,
                  marginInline: 'auto',
                  objectFit: 'contain',
                  width: '100%',
                }}
              />
            </button>
          </Flexbox>

          <section className={styles.assistantPanel} style={{ marginTop: 34 }}>
            <div className={styles.assistantHeader}>
              <Flexbox horizontal align="center" gap={14}>
                <img alt="AI数字人" className={styles.assistantAvatar} src="/avatar.png" />
                <div>
                  <h2 style={{ fontSize: 30, fontWeight: 900, lineHeight: 1.1, margin: 0 }}>
                    AI数字人
                  </h2>
                  <p
                    style={{
                      color: 'rgb(220 255 242)',
                      fontSize: 17,
                      fontWeight: 700,
                      margin: '8px 0 0',
                    }}
                  >
                    随时为您解答环保相关问题，支持档案库/环保知识库/环保智能体提问
                  </p>
                </div>
              </Flexbox>
              <Button
                icon={<Icon icon={Smartphone} />}
                type="default"
                style={{
                  borderColor: 'rgb(255 255 255 / 28%)',
                  color: '#fff',
                  background: 'rgb(255 255 255 / 12%)',
                }}
                onClick={() => navigate(SHARED_AGENT_PATH)}
              >
                进入手机版
              </Button>
            </div>

            <Flexbox gap={78} style={{ minHeight: 420, padding: '30px 32px 54px' }}>
              <Flexbox horizontal align="center" gap={18}>
                <img alt="AI数字人" className={styles.assistantAvatar} src="/avatar.png" />
                <div className={styles.bubbleAi}>
                  您好！我是环保智能助手，有什么可以帮助您的吗？
                </div>
              </Flexbox>

              <Flexbox horizontal align="center" gap={16} justify="flex-end">
                <div className={styles.bubbleUser}>生态环境法典何时起效</div>
                <Center
                  style={{
                    background: '#e8eef6',
                    borderRadius: '50%',
                    color: '#516075',
                    flex: 'none',
                    height: 48,
                    width: 48,
                  }}
                >
                  <Icon icon={User} size={24} />
                </Center>
              </Flexbox>

              <Flexbox horizontal align="center" gap={18}>
                <img alt="AI数字人" className={styles.assistantAvatar} src="/avatar.png" />
                <div className={styles.bubbleAi}>
                  《中华人民共和国生态环境法典》自2026年8月15日起施行。
                </div>
              </Flexbox>
            </Flexbox>
          </section>

          <section className={styles.metricSection}>
            <h2 className={styles.metricTitle}>平台数据概览</h2>
            <p className={styles.metricSubtitle}>核心业务数据总览，一键进入相关分析模块</p>

            <div className={styles.metricGrid}>
              {metrics.map((metric) => (
                <button
                  className={styles.metricCard}
                  key={metric.label}
                  type="button"
                  onClick={() => navigate(metric.path)}
                >
                  <div className={styles.metricTop}>
                    <div className={styles.metricIcon} style={{ background: metric.gradient }}>
                      <Icon color="#fff" icon={metric.icon} size={32} />
                    </div>
                    <div>
                      <div className={styles.metricValue}>
                        {metric.value}
                        {metric.suffix}
                      </div>
                      <div className={styles.metricLabel}>{metric.label}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18 }}>
                    {metric.suffix ? (
                      <svg
                        aria-hidden
                        height="56"
                        style={{ color: '#10b981', flex: 'none' }}
                        viewBox="0 0 56 56"
                        width="56"
                      >
                        <circle
                          cx="28"
                          cy="28"
                          fill="none"
                          r="22"
                          stroke="#d7dee8"
                          strokeWidth="6"
                        />
                        <circle
                          cx="28"
                          cy="28"
                          fill="none"
                          r="22"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeWidth="6"
                          style={getDonutStyle(metric.value)}
                          transform="rotate(-90 28 28)"
                        />
                      </svg>
                    ) : (
                      <div className={styles.metricBars}>
                        {metric.bars?.map((height, index) => (
                          <span
                            key={`${metric.label}-${index}`}
                            style={{
                              background: '#10b981',
                              borderRadius: 3,
                              display: 'block',
                              height: `${height}%`,
                              width: 8,
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </section>
        </section>
      </main>
    </div>
  );
});

export default Home;
