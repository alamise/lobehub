import { createStaticStyles } from 'antd-style';

/**
 * 企业详情页共享样式。
 *
 * 页面由原「左中右三栏」重构为「顶部信息 + 四个 Tab」结构，
 * 各 Tab 组件共用同一份静态样式，避免样式重复定义与视觉漂移。
 */
export const styles = createStaticStyles(({ css }) => ({
  'archiveTable': css`
    overflow: hidden;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    background: #fff;

    table {
      border-collapse: collapse;
      width: 100%;
      font-size: 13px;
    }

    th {
      padding-block: 12px;
      padding-inline: 16px;
      border-block-end: 1px solid #e2e8f0;

      color: #64748b;
      text-align: start;

      background: #f8fafc;
    }

    td {
      padding-block: 12px;
      padding-inline: 16px;
      border-block-end: 1px solid #f1f5f9;

      color: #334155;
      vertical-align: top;
    }

    tr:last-child td {
      border-block-end: 0;
    }

    tbody tr {
      cursor: pointer;
    }

    tbody tr:hover {
      background: #f8fafc;
    }
  `,
  'categoryChip': css`
    cursor: pointer;

    display: inline-flex;
    gap: 8px;
    align-items: center;

    padding-block: 7px;
    padding-inline: 14px;
    border: 1px solid #e2e8f0;
    border-radius: 999px;

    font-size: 13px;
    color: #334155;

    background: #fff;

    transition: all 0.16s ease;

    &:hover {
      border-color: #6ee7b7;
      color: #047857;
    }
  `,
  'categoryChipActive': css`
    border-color: #10b981;
    color: #047857;
    background: #ecfdf5;
  `,
  'categoryChipCount': css`
    font-size: 12px;
    color: #94a3b8;
  `,
  'categoryChipRow': css`
    display: flex;
    flex-wrap: wrap;
    gap: 8px;

    padding: 14px;
    border: 1px solid #e2e8f0;
    border-radius: 12px;

    background: #fff;
  `,
  'chatShell': css`
    display: flex;
    flex-direction: column;

    width: min(960px, 100%);
    height: min(72vh, 720px);
    min-height: 420px;
    margin-block: 0;
    margin-inline: auto;
    border: 1px solid #e2e8f0;
    border-radius: 14px;

    background: #fff;
  `,
  'chatShellMobile': css`
    height: calc(100vh - 190px);
    min-height: 520px;
    border-radius: 12px;
  `,
  'chatShellBody': css`
    overflow: hidden;
    display: flex;
    flex: 1;
    flex-direction: column;

    min-height: 0;
    padding: 16px;
    border-end-start-radius: 14px;
    border-end-end-radius: 14px;

    background: #f8fafc;
  `,
  'chatShellBodyMobile': css`
    padding: 10px;
  `,
  'chatShellHeader': css`
    flex: none;

    padding: 14px;
    border-block-end: 2px solid #10b981;

    font-weight: 700;
    color: #059669;
    text-align: center;
  `,
  'container': css`
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-height: 0;
  `,
  'emptyCenter': css`
    display: flex;
    align-items: center;
    justify-content: center;

    height: 100%;
    min-height: 320px;
    border: 1px solid #e2e8f0;
    border-radius: 16px;

    background: #fff;
  `,
  'factoryItem': css`
    padding: 14px;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    background: #fff;
  `,
  'fieldGrid': css`
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 14px;

    @media (width <= 1280px) {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  `,
  'fieldItem': css`
    min-width: 0;
  `,
  'fieldLabel': css`
    margin-block-end: 6px;
    font-size: 12px;
    color: #64748b;
  `,
  'fieldValue': css`
    font-size: 14px;
    color: #1e293b;
    overflow-wrap: anywhere;
    white-space: pre-wrap;
  `,
  'headerCard': css`
    display: flex;
    gap: 16px;
    align-items: center;
    justify-content: space-between;

    padding: 18px;
    border: 1px solid #e2e8f0;
    border-radius: 16px;

    background: #fff;
    box-shadow: 0 1px 2px rgb(15 23 42 / 6%);
  `,
  'headerCardMobile': css`
    flex-direction: column;
    gap: 12px;
    align-items: stretch;

    padding: 14px;
    border-radius: 12px;
  `,
  'headerTitle': css`
    display: flex;
    flex: 1;
    gap: 12px;
    align-items: center;

    min-width: 0;
  `,
  'headerTitleMobile': css`
    align-items: flex-start;
  `,
  'iconBox': css`
    display: flex;
    flex: none;
    align-items: center;
    justify-content: center;

    width: 44px;
    height: 44px;
    border-radius: 12px;

    color: #059669;

    background: #ecfdf5;
  `,
  'moduleGrid': css`
    display: grid;
    gap: 12px;
  `,
  'moduleTable': css`
    overflow: auto;
    border: 1px solid #e2e8f0;
    border-radius: 10px;

    table {
      border-collapse: collapse;
      width: 100%;
      min-width: 680px;
      font-size: 12px;
    }

    th {
      padding-block: 10px;
      padding-inline: 12px;
      border-block-end: 1px solid #e2e8f0;

      color: #64748b;
      text-align: start;

      background: #f8fafc;
    }

    td {
      padding-block: 10px;
      padding-inline: 12px;
      border-block-end: 1px solid #f1f5f9;

      color: #334155;
      vertical-align: top;
    }

    tr:last-child td {
      border-block-end: 0;
    }
  `,
  'projectDetail': css`
    overflow: auto;
    flex: 1;

    min-width: 0;
    padding: 16px;
    border: 1px solid #e2e8f0;
    border-radius: 14px;

    background: #fff;
  `,
  'projectDetailMobile': css`
    width: 100%;
    padding: 12px;
  `,
  'projectFactoryLabel': css`
    padding-block: 10px 6px;
    padding-inline: 6px;

    font-size: 12px;
    font-weight: 700;
    color: #94a3b8;
  `,
  'projectHeader': css`
    display: flex;
    gap: 12px;
    align-items: flex-start;
    justify-content: space-between;

    margin-block-end: 12px;
    padding-block-end: 12px;
    border-block-end: 1px solid #e2e8f0;
  `,
  'projectHeaderMobile': css`
    flex-direction: column;
  `,
  'projectListItem': css`
    cursor: pointer;

    display: block;

    width: 100%;
    padding-block: 10px;
    padding-inline: 12px;
    border: 1px solid transparent;
    border-radius: 10px;

    color: #334155;
    text-align: start;

    background: transparent;

    transition: all 0.16s ease;

    &:hover {
      background: #f1f5f9;
    }
  `,
  'projectListItemActive': css`
    border-color: #a7f3d0;
    color: #047857;
    background: #ecfdf5;
  `,
  'projectListItemMeta': css`
    margin-block-start: 4px;
    font-size: 12px;
    color: #94a3b8;
    overflow-wrap: anywhere;
  `,
  'projectListItemTitle': css`
    font-size: 13px;
    font-weight: 600;
    overflow-wrap: anywhere;
  `,
  'projectListPanel': css`
    overflow: auto;

    width: 300px;
    min-width: 300px;
    max-height: 720px;
    padding: 10px;
    border: 1px solid #e2e8f0;
    border-radius: 14px;

    background: #f8fafc;
  `,
  'projectListPanelMobile': css`
    width: 100%;
    min-width: 0;
    max-height: 320px;
    padding: 8px;
  `,
  'projectSplit': css`
    display: flex;
    gap: 14px;
    align-items: flex-start;
    min-height: 0;
  `,
  'projectSplitMobile': css`
    flex-direction: column;
  `,
  'searchBar': css`
    display: flex;
    gap: 8px;

    margin-block: 12px;
    padding: 14px;
    border: 1px solid #e2e8f0;
    border-radius: 12px;

    background: #fff;
  `,
  'tabCard': css`
    padding: 16px;
    border: 1px solid #e2e8f0;
    border-radius: 16px;

    background: #fff;
    box-shadow: 0 1px 2px rgb(15 23 42 / 6%);
  `,
  'tabCardMobile': css`
    padding: 10px;
    border-radius: 12px;

    .ant-tabs-nav {
      overflow-x: auto;
    }
  `,
  '@media (max-width: 1199px)': {
    projectListPanel: css`
      width: 100%;
      min-width: 0;
      max-height: 280px;
    `,
    projectSplit: css`
      flex-direction: column;
    `,
  },
  '@media (max-width: 767px)': {
    archiveTable: css`
      overflow: auto;

      table {
        min-width: 680px;
      }
    `,
    categoryChipRow: css`
      overflow-x: auto;
      flex-wrap: nowrap;
      padding: 10px;
    `,
    chatShell: css`
      height: calc(100vh - 190px);
      min-height: 520px;
      border-radius: 12px;
    `,
    chatShellBody: css`
      padding: 10px;
    `,
    fieldGrid: css`
      grid-template-columns: 1fr;
      gap: 10px;
    `,
    headerCard: css`
      flex-direction: column;
      gap: 12px;
      align-items: stretch;

      padding: 14px;
      border-radius: 12px;
    `,
    headerTitle: css`
      align-items: flex-start;
    `,
    moduleTable: css`
      table {
        min-width: 620px;
      }
    `,
    projectDetail: css`
      padding: 12px;
    `,
    projectHeader: css`
      flex-direction: column;
    `,
    projectListPanel: css`
      max-height: 240px;
      padding: 8px;
    `,
    searchBar: css`
      flex-direction: column;
      padding: 10px;
    `,
    tabCard: css`
      padding: 10px;
      border-radius: 12px;

      .ant-tabs-nav {
        overflow-x: auto;
      }
    `,
  },
}));

export default styles;
