import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import Body from './index';

const navigate = vi.fn();

vi.mock('@lobehub/ui', () => ({
  Accordion: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AccordionItem: ({ children, title }: { children: React.ReactNode; title: React.ReactNode }) => (
    <section>
      <div>{title}</div>
      <div>{children}</div>
    </section>
  ),
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
  navigate.mockReset();
});

describe('Business sidebar body', () => {
  it('renders the business menu tree', () => {
    render(<Body />);

    expect(screen.getByText('AI 数字人')).toBeInTheDocument();
    expect(screen.getByText('AI 辅助决策')).toBeInTheDocument();
    expect(screen.getByText('水环境质量分析')).toBeInTheDocument();
    expect(screen.getByText('AI 辅助执法')).toBeInTheDocument();
    expect(screen.getByText('AI 环评')).toBeInTheDocument();
    expect(screen.getByText('AI 辅助监测')).toBeInTheDocument();
    expect(screen.getByText('AI 辅助办公')).toBeInTheDocument();
  });
});
