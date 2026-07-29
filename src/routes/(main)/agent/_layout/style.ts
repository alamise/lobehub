import { createStaticStyles } from 'antd-style';

export const styles = createStaticStyles(({ css, cssVar }) => ({
  // Main container
  mainContainer: css`
    position: relative;
    overflow: hidden;
    background: ${cssVar.colorBgContainer};
  `,
  // 会话列表左列（业务导航之外，复刻 lobehub 原生会话/话题列表）
  conversationList: css`
    overflow: hidden;
    flex: none;

    width: 280px;
    height: 100%;
    border-inline-end: 1px solid ${cssVar.colorBorderSecondary};

    background: ${cssVar.colorBgContainer};
  `,
  // 详情页右侧对话区
  chatArea: css`
    position: relative;
    overflow: hidden;
    height: 100%;
  `,
}));
