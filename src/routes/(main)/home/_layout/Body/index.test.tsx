import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import Body from './index';

const adminState = vi.hoisted(() => ({ value: false }));
const navigate = vi.fn();

vi.mock('@/business/client/hooks/useIsAdminAccount', () => ({
  useIsAdminAccount: () => adminState.value,
}));

vi.mock('@lobehub/ui', () => ({
  Accordion: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AccordionItem: ({ children, title }: { children: React.ReactNode; title: React.ReactNode }) => (
    <section>
      <div>{title}</div>
      <div>{children}</div>
    </section>
  ),
  Center: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Flexbox: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Icon: () => <span />,
  Text: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock('react-router', () => ({
  useLocation: () => ({ pathname: '/' }),
}));

vi.mock('@/features/NavPanel/components/NavItem', () => ({
  default: ({ title }: { title: string }) => <div>{title}</div>,
}));

vi.mock('@/features/Workspace/useWorkspaceAwareNavigate', () => ({
  useWorkspaceAwareNavigate: () => navigate,
}));

vi.mock('@/features/Workspace/WorkspaceLink', () => ({
  default: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));

vi.mock('@/utils/navigation', () => ({
  isModifierClick: () => false,
}));

afterEach(() => {
  cleanup();
  adminState.value = false;
  navigate.mockReset();
});

describe('Business sidebar body', () => {
  it('renders the business menu tree', () => {
    render(<Body />);

    expect(screen.getByTitle('AI 数字人')).toBeInTheDocument();
    expect(screen.getByTitle('AI 辅助决策')).toBeInTheDocument();
    expect(screen.getByTitle('AI 辅助执法')).toBeInTheDocument();
    expect(screen.getByTitle('AI 辅助审批')).toBeInTheDocument();
    expect(screen.getByTitle('AI 辅助监测')).toBeInTheDocument();
    expect(screen.getByTitle('AI 辅助办公')).toBeInTheDocument();
  });

  it('hides agent management for non-admin accounts', () => {
    adminState.value = false;

    render(<Body />);

    expect(screen.queryByText('智能体管理')).toBeNull();
  });

  it('renders agent management for admin accounts', () => {
    adminState.value = true;

    render(<Body />);

    expect(screen.getByText('智能体管理')).toBeInTheDocument();
  });
});
