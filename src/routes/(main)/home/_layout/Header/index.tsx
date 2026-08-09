'use client';

import { Flexbox, Text } from '@lobehub/ui';
import { createStaticStyles } from 'antd-style';
import { memo } from 'react';

import ToggleLeftPanelButton from '@/features/NavPanel/ToggleLeftPanelButton';

const styles = createStaticStyles(({ css }) => ({
  brandMark: css`
    display: flex;
    align-items: center;
    justify-content: center;

    width: 38px;
    height: 38px;
    border-radius: 10px;

    font-size: 20px;
    font-weight: 900;
    color: #fff;

    background: linear-gradient(135deg, #24d09b 0%, #0ca66f 100%);
  `,
  header: css`
    flex: none;

    padding-block: 24px 28px;
    padding-inline: 22px;
    border-block-end: 1px solid rgb(148 163 184 / 16%);

    color: #fff;

    background: #0f1b2d;

    #toggle_left_panel_button {
      color: #9fb0c8;

      &:hover {
        color: #fff;
        background: rgb(255 255 255 / 8%);
      }
    }
  `,
}));

const Header = memo(() => (
  <div className={styles.header}>
    <Flexbox horizontal align="center" gap={12} justify="space-between">
      <Flexbox horizontal align="center" gap={14} style={{ minWidth: 0 }}>
        <span className={styles.brandMark}>余</span>
        <Text ellipsis color="#fff" fontSize={19} weight={800}>
          余杭环保AI
        </Text>
      </Flexbox>
      <ToggleLeftPanelButton forceVisible />
    </Flexbox>
  </div>
));

export default Header;
