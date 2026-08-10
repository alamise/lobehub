'use client';

import { DraggablePanel } from '@lobehub/ui';
import { createStaticStyles, cx } from 'antd-style';
import { type ReactNode } from 'react';
import { memo, Suspense, useRef } from 'react';

import NavPanelUpgradeEntry from '@/business/client/features/NavPanelUpgradeEntry';
import { isDesktop } from '@/const/version';
import { TOGGLE_BUTTON_ID } from '@/features/NavPanel/ToggleLeftPanelButton';
import { USER_DROPDOWN_ICON_ID } from '@/routes/(main)/home/_layout/Header/components/User';
import { useGlobalStore } from '@/store/global';
import {
  NAV_PANEL_MAX_WIDTH,
  NAV_PANEL_MIN_WIDTH,
  systemStatusSelectors,
} from '@/store/global/selectors';
import { isMacOS } from '@/utils/platform';

import { useNavPanelSizeChangeHandler } from '../hooks/useNavPanel';
import { BACK_BUTTON_ID } from './BackButton';
import HomeSidebarFooter from './HomeSidebarFooter';

const draggableStyles = createStaticStyles(({ css, cssVar }) => ({
  content: css`
    position: relative;

    overflow: hidden;
    display: flex;
    flex-direction: column;

    height: 100%;
    min-height: 100%;
    max-height: 100%;
  `,
  darkPanel: css`
    --ant-color-bg-container: #0f1b2d;
    --ant-color-bg-elevated: #17263a;
    --ant-color-bg-layout: #0f1b2d;
    --ant-color-border: rgb(255 255 255 / 10%);
    --ant-color-fill-quaternary: rgb(255 255 255 / 13%);
    --ant-color-fill-secondary: rgb(255 255 255 / 8%);
    --ant-color-fill-tertiary: rgb(255 255 255 / 6%);
    --ant-color-text: #f3f7fb;
    --ant-color-text-description: #9eafc5;
    --ant-color-text-quaternary: #7e91aa;
    --ant-color-text-secondary: #c6d3e3;
    --ant-color-text-tertiary: #9eafc5;

    color: #c6d3e3;
    background: #0f1b2d;

    .ant-breadcrumb .ant-breadcrumb-link {
      color: #9eafc5;
    }

    .ant-breadcrumb a.ant-breadcrumb-link:hover {
      color: #f3f7fb !important;
    }

    .ant-breadcrumb .ant-breadcrumb-separator {
      color: #7e91aa;
    }

    #${BACK_BUTTON_ID} {
      color: #c6d3e3;
    }

    #${BACK_BUTTON_ID}:hover {
      color: #f3f7fb;
      background: rgb(255 255 255 / 8%);
    }
  `,
  inner: css`
    position: relative;

    overflow: hidden;
    flex: 1;

    min-width: 240px;
    max-width: 100%;
    min-height: 0;
  `,
  layer: css`
    position: absolute;
    inset: 0;

    overflow: hidden;
    display: flex;
    flex-direction: column;

    min-width: 240px;
    max-width: 100%;
    min-height: 100%;
    max-height: 100%;
  `,
  panel: css`
    user-select: none;
    height: 100%;
    color: ${cssVar.colorTextSecondary};
    background: ${isDesktop && isMacOS() ? 'transparent' : cssVar.colorBgLayout};

    * {
      user-select: none;
    }

    #${TOGGLE_BUTTON_ID} {
      width: 0 !important;
      opacity: 0;
      transition:
        opacity,
        width 0.2s ${cssVar.motionEaseOut};
    }

    #${USER_DROPDOWN_ICON_ID} {
      width: 0 !important;
      opacity: 0;
      transition:
        opacity,
        width 0.2s ${cssVar.motionEaseOut};
    }
    #${BACK_BUTTON_ID} {
      width: 24px !important;
    }

    &:hover {
      #${TOGGLE_BUTTON_ID} {
        width: 32px !important;
        opacity: 1;
      }

      #${USER_DROPDOWN_ICON_ID} {
        width: 14px !important;
        opacity: 1;
      }
    }

    @media (width <= 768px) {
      position: fixed !important;
      z-index: 30 !important;
      inset-block: 0 !important;
      inset-inline-start: 0 !important;

      width: min(320px, calc(100vw - 48px)) !important;
      min-width: 0 !important;
      max-width: min(320px, calc(100vw - 48px)) !important;

      box-shadow: 16px 0 40px rgb(15 23 42 / 22%);

      #${TOGGLE_BUTTON_ID}, #${USER_DROPDOWN_ICON_ID} {
        opacity: 1;
      }
    }
  `,
}));

interface NavPanelDraggableProps {
  activeContent: {
    key: string;
    node: ReactNode;
  };
}

const classNames = {
  content: draggableStyles.content,
};

const HOME_NAV_PANEL_MIN_WIDTH = 300;

export const NavPanelDraggable = memo<NavPanelDraggableProps>(({ activeContent }) => {
  const [expand, togglePanel, isStatusInit] = useGlobalStore((s) => [
    systemStatusSelectors.showLeftPanel(s),
    s.toggleLeftPanel,
    systemStatusSelectors.isStatusInit(s),
  ]);
  const handleSizeChange = useNavPanelSizeChangeHandler();

  // Defer DraggablePanel mount until system status hydrates; otherwise defaultSize
  // captures the pre-hydration default and the DOM drifts off NavigationBar's live width.
  const defaultWidthRef = useRef(0);
  const isHomeNav = activeContent.key === 'home' || activeContent.key === 'agent';
  const minWidth = isHomeNav ? HOME_NAV_PANEL_MIN_WIDTH : NAV_PANEL_MIN_WIDTH;

  if (defaultWidthRef.current === 0 && isStatusInit) {
    const storedWidth = systemStatusSelectors.leftPanelWidth(useGlobalStore.getState());
    defaultWidthRef.current = isHomeNav
      ? Math.max(HOME_NAV_PANEL_MIN_WIDTH, storedWidth)
      : storedWidth;
  }

  const styles = { background: '#0f1b2d', zIndex: 11 };

  if (defaultWidthRef.current === 0) {
    const pendingStoredWidth = systemStatusSelectors.leftPanelWidth(useGlobalStore.getState());
    const pendingWidth = isHomeNav
      ? Math.max(HOME_NAV_PANEL_MIN_WIDTH, pendingStoredWidth)
      : pendingStoredWidth;
    return (
      <div
        aria-hidden
        style={{
          flexShrink: 0,
          height: '100%',
          maxWidth: 'min(320px, calc(100vw - 48px))',
          width: pendingWidth,
        }}
      />
    );
  }

  const defaultSize = { height: '100%', width: defaultWidthRef.current };

  return (
    <DraggablePanel
      className={cx(draggableStyles.panel, draggableStyles.darkPanel)}
      classNames={classNames}
      defaultSize={defaultSize}
      expand={expand}
      expandable={false}
      maxWidth={NAV_PANEL_MAX_WIDTH}
      minWidth={minWidth}
      placement="left"
      showBorder={false}
      style={styles}
      onExpandChange={togglePanel}
      onSizeDragging={handleSizeChange}
    >
      <div className={draggableStyles.inner}>
        <div className={draggableStyles.layer} key={activeContent.key}>
          {activeContent.node}
        </div>
      </div>
      <Suspense fallback={null}>
        <NavPanelUpgradeEntry />
      </Suspense>
      {isHomeNav && (
        <Suspense>
          <HomeSidebarFooter />
        </Suspense>
      )}
    </DraggablePanel>
  );
});
