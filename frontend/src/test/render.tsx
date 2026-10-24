import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router';
import { AppProviders } from '../app/AppProviders';
import { AppRoutes } from '../app/AppRoutes';
import { createQueryClient } from '../app/query-client';

function LocationProbe() {
  const location = useLocation();
  return (
    <output data-testid="location" hidden>
      {location.pathname}
      {location.search}
    </output>
  );
}

/**
 * Renders the real route tree at `path`, with the real providers, against the
 * MSW-mocked API. Tests therefore exercise routing, guards, data fetching and
 * components together, the way a user would experience them.
 */
export function renderRoute(path = '/') {
  const queryClient = createQueryClient({ queries: { retry: false } });
  const user = userEvent.setup();

  render(
    <AppProviders queryClient={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
        <LocationProbe />
      </MemoryRouter>
    </AppProviders>,
  );

  return { user, queryClient, location: () => screen.getByTestId('location').textContent };
}
