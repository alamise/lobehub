import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import AgentsRoute from './index';

const adminState = vi.hoisted(() => ({ value: true }));
const storeState = vi.hoisted(() => ({ isLoaded: true }));

vi.mock('@/features/AgentViewAll', () => ({
  AgentViewAllPage: () => <div data-testid="agents-page" />,
}));

vi.mock('@/business/client/hooks/useIsAdminAccount', () => ({
  useAdminAccountState: () => ({ isAdmin: adminState.value, isLoading: false }),
  useIsAdminAccount: () => adminState.value,
}));

vi.mock('@/store/user', () => ({
  useUserStore: (selector: (state: typeof storeState) => unknown) => selector(storeState),
}));

describe('/agents route', () => {
  const renderRoute = () =>
    render(
      <MemoryRouter>
        <AgentsRoute />
      </MemoryRouter>,
    );

  it('renders the agent management page for admin accounts', () => {
    adminState.value = true;

    renderRoute();

    expect(screen.getByTestId('agents-page')).toBeInTheDocument();
  });

  it('renders forbidden for non-admin accounts', () => {
    adminState.value = false;

    renderRoute();

    expect(screen.queryByTestId('agents-page')).toBeNull();
    expect(screen.getByText('403')).toBeInTheDocument();
  });
});
