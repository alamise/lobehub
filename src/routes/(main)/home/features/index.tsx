'use client';

import { Center, Flexbox, Icon, Text } from '@lobehub/ui';
import { Button } from '@lobehub/ui/base-ui';
import { createStaticStyles } from 'antd-style';
import {
  Bell,
  Building2,
  ClipboardList,
  FolderOpen,
  Landmark,
  Smartphone,
  User,
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
        </section>
      </main>
    </div>
  );
});

export default Home;
