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
  Settings2,
  Smartphone,
  User,
  Waves,
} from 'lucide-react';
import { memo } from 'react';

import { useIsAdminAccount } from '@/business/client/hooks/useIsAdminAccount';
import { SHARED_AGENT_PATH } from '@/features/BusinessNavigation/config';
import ToggleLeftPanelButton from '@/features/NavPanel/ToggleLeftPanelButton';
import UserAvatar from '@/features/User/UserAvatar';
import { useWorkspaceAwareNavigate } from '@/features/Workspace/useWorkspaceAwareNavigate';
import WorkspaceLink from '@/features/Workspace/WorkspaceLink';
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

    @media (width <= 640px) {
      width: 36px;
      height: 36px;
    }
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

    @media (width <= 720px) {
      flex-direction: column;
      gap: 16px;
      align-items: flex-start;

      padding-block: 18px;
      padding-inline: 18px;
      border-radius: 16px 16px 0 0;
    }
  `,
  assistantPanel: css`
    overflow: hidden;
    border-radius: 20px;
    background: #fff;
    box-shadow: 0 18px 40px rgb(15 23 42 / 8%);

    @media (width <= 720px) {
      border-radius: 16px;
    }

    @media (width <= 640px) {
      display: none;
    }
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

    @media (width <= 640px) {
      max-width: calc(100% - 48px);
      padding-block: 14px;
      padding-inline: 16px;
      font-size: 14px;
    }
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

    @media (width <= 640px) {
      max-width: calc(100% - 48px);
      padding-block: 14px;
      padding-inline: 16px;
      font-size: 14px;
    }
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

    @media (width <= 720px) {
      min-height: 148px;
      padding-block: 22px;
      padding-inline: 16px;
      border-radius: 14px;
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
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;

      max-width: none;
      padding: 18px;
      border-radius: 24px;

      background: #fff;
      box-shadow: 0 10px 26px rgb(15 23 42 / 5%);
    }

    @media (width <= 360px) {
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

    @media (width <= 720px) {
      width: 56px;
      height: 56px;
      margin-block-end: 14px;
      border-radius: 14px;
    }
  `,
  assistantConversation: css`
    min-height: 420px;
    padding-block: 30px 54px;
    padding-inline: 32px;

    @media (width <= 720px) {
      gap: 34px !important;
      min-height: 0;
      padding-block: 20px 28px;
      padding-inline: 16px;
    }
  `,
  heroImageButton: css`
    cursor: pointer;

    flex: 0 0 300px;
    align-self: stretch;

    padding: 0;
    border: 0;

    background: transparent;

    @media (width <= 980px) {
      flex: 0 0 auto;
      align-self: center;
      width: min(280px, 72vw);
    }

    @media (width <= 640px) {
      display: none;
    }
  `,
  heroImage: css`
    display: block;

    width: 100%;
    height: 350px;
    margin-inline: auto;

    object-fit: contain;

    @media (width <= 980px) {
      height: 260px;
    }

    @media (width <= 520px) {
      height: 210px;
    }
  `,
  heroRow: css`
    display: flex;
    gap: 32px;
    align-items: flex-start;
    justify-content: space-between;

    @media (width <= 980px) {
      flex-direction: column;
      gap: 24px;
    }

    @media (width <= 640px) {
      gap: 18px;
    }
  `,
  heroIntro: css`
    @media (width <= 640px) {
      padding-block: 24px;
      padding-inline: 18px;
      border-radius: 22px;

      text-align: center;

      background: #fff;
      box-shadow: 0 8px 22px rgb(15 23 42 / 5%);
    }
  `,
  heroSubtitle: css`
    margin-block: 18px 0;
    margin-inline: 0;

    font-size: 20px;
    font-weight: 700;
    line-height: 1.7;
    color: #526176;

    @media (width <= 640px) {
      margin-block-start: 12px;
      font-size: 18px;
      line-height: 1.55;
    }
  `,
  heroTitle: css`
    margin: 0;

    font-size: clamp(42px, 4vw, 58px);
    font-weight: 900;
    line-height: 1.08;
    color: transparent;
    letter-spacing: 0;

    background: linear-gradient(90deg, #097f68 0%, #13a760 52%, #0097bd 100%);
    background-clip: text;

    @media (width <= 640px) {
      font-size: 32px;
      line-height: 1.18;
    }
  `,
  mobileAssistantBanner: css`
    display: none;

    @media (width <= 640px) {
      position: relative;

      overflow: hidden;
      display: grid;
      grid-template-columns: minmax(0, 1fr) 132px;
      gap: 12px;

      margin-block-start: 18px;
      padding-block: 20px;
      padding-inline: 18px;
      border-radius: 24px;

      color: #fff;

      background:
        radial-gradient(circle at 76% 42%, rgb(255 255 255 / 23%), transparent 28%),
        linear-gradient(135deg, #09a978 0%, #0797b8 100%);
      box-shadow: 0 18px 34px rgb(9 151 184 / 18%);
    }
  `,
  mobileAssistantImage: css`
    align-self: center;

    width: 128px;
    height: 122px;
    padding: 6px;
    border: 1px solid rgb(255 255 255 / 35%);
    border-radius: 22px;

    object-fit: contain;
    background: rgb(255 255 255 / 18%);
  `,
  mobileAssistantLabel: css`
    display: inline-flex;

    width: fit-content;
    margin-block-end: 16px;
    padding-block: 4px;
    padding-inline: 14px;
    border: 1px solid rgb(255 255 255 / 35%);
    border-radius: 999px;

    font-size: 13px;
    font-weight: 800;
    line-height: 1;
    letter-spacing: 2px;

    background: rgb(255 255 255 / 16%);
  `,
  mobileAssistantTitle: css`
    margin: 0;
    font-size: 26px;
    font-weight: 900;
    line-height: 1.18;
  `,
  mobileAssistantText: css`
    margin-block: 12px 18px;
    font-size: 15px;
    font-weight: 700;
    line-height: 1.5;
  `,
  mobileAssistantButton: css`
    cursor: pointer;

    padding-block: 8px;
    padding-inline: 18px;
    border: 0;
    border-radius: 999px;

    font-size: 15px;
    font-weight: 900;
    color: #078a68;

    background: #fff;
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

    @media (width <= 680px) {
      min-height: 140px;
      padding-block: 20px;
      padding-inline: 18px;
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

    @media (width <= 680px) {
      margin-block-start: 34px;
    }
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

    @media (width <= 420px) {
      gap: 12px;
    }
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

    @media (width <= 520px) {
      padding-block: 14px 28px;
      padding-inline: 10px;
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

    @media (width <= 520px) {
      padding: 0;
      border-radius: 0;
      background: transparent;
      box-shadow: none;
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

    @media (width <= 860px) {
      gap: 12px;

      height: auto;
      min-height: 58px;
      padding-block: 10px;
      padding-inline: 16px;
    }

    @media (width <= 640px) {
      display: none;
    }
  `,
  settingsCard: css`
    cursor: pointer;

    display: inline-flex;
    align-items: center;

    padding-block: 6px;
    padding-inline: 12px;
    border: 1px solid #dbe4ee;
    border-radius: 999px;

    background: #f4f8fc;

    transition:
      background 0.2s ease,
      border-color 0.2s ease;

    &:hover {
      border-color: #c3d4e6;
      background: #e9f1f9;
    }
  `,
  adminBadge: css`
    padding-block: 3px;
    padding-inline: 8px;
    border: 1px solid #bfe6cf;
    border-radius: 999px;

    font-size: 11px;
    line-height: 1;
    color: #2f7d54;
    white-space: nowrap;

    background: #e7f6ee;
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
  const isAdmin = useIsAdminAccount();
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
          {isAdmin && (
            <WorkspaceLink className={styles.settingsCard} to="/settings">
              <Flexbox horizontal align="center" gap={6}>
                <Icon color="#3b6ea5" icon={Settings2} size={15} />
                <Text color="#27364b" fontSize={14} weight={600}>
                  系统设置
                </Text>
                <span className={styles.adminBadge}>仅管理员可见</span>
              </Flexbox>
            </WorkspaceLink>
          )}
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
          <div className={styles.heroRow}>
            <Flexbox flex={1} gap={34} style={{ minWidth: 0 }}>
              <div className={styles.heroIntro}>
                <h1 className={styles.heroTitle}>智慧环保 AI驱动未来</h1>
                <p className={styles.heroSubtitle}>
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
              className={styles.heroImageButton}
              type="button"
              onClick={() => navigate(SHARED_AGENT_PATH)}
            >
              <img
                alt="环保数字人"
                className={styles.heroImage}
                src="/hangxiaohuan-character.png"
              />
            </button>
          </div>

          <section className={styles.mobileAssistantBanner}>
            <div>
              <span className={styles.mobileAssistantLabel}>AI 助手</span>
              <h2 className={styles.mobileAssistantTitle}>数字人问答</h2>
              <p className={styles.mobileAssistantText}>点击进入，直接发起文本或语音提问</p>
              <button
                className={styles.mobileAssistantButton}
                type="button"
                onClick={() => navigate(SHARED_AGENT_PATH)}
              >
                立即进入
              </button>
            </div>
            <img
              alt="余小环数字人"
              className={styles.mobileAssistantImage}
              src="/hangxiaohuan-character.png"
            />
          </section>

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

            <Flexbox className={styles.assistantConversation} gap={78}>
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
