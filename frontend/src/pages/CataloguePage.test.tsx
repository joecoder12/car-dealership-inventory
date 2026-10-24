import { screen, waitFor, within } from '@testing-library/react';
import { delay, http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { errorBody, makeVehicle, pageOf } from '../test/fixtures';
import { renderRoute } from '../test/render';
import { server } from '../test/server';

/** Records every catalogue request so tests can assert on the query string. */
function captureCatalogueRequests(respond = () => HttpResponse.json(pageOf([]))) {
  const requests: URL[] = [];
  const handler = ({ request }: { request: Request }) => {
    requests.push(new URL(request.url));
    return respond();
  };
  server.use(http.get('*/api/vehicles', handler), http.get('*/api/vehicles/search', handler));
  return {
    requests,
    last: () => requests[requests.length - 1]!,
  };
}

describe('CataloguePage', () => {
  it('shows every vehicle from the API with its key details', async () => {
    server.use(
      http.get('*/api/vehicles', () =>
        HttpResponse.json(
          pageOf([
            makeVehicle({ make: 'Toyota', model: 'Camry XSE', price: 31250, quantity: 6 }),
            makeVehicle({
              make: 'Ford',
              model: 'F-150 Lariat',
              category: 'TRUCK',
              price: 63900.5,
              quantity: 1,
              fuelType: 'PETROL',
              year: 2024,
            }),
          ]),
        ),
      ),
    );
    renderRoute('/');

    const camry = await screen.findByRole('article', { name: /toyota camry xse/i });
    expect(within(camry).getByText('$31,250')).toBeVisible();
    expect(within(camry).getByText('6 in stock')).toBeVisible();
    expect(within(camry).getByText('Sedan')).toBeVisible();

    const truck = screen.getByRole('article', { name: /ford f-150 lariat/i });
    expect(within(truck).getByText('$63,900.50')).toBeVisible();
    expect(within(truck).getByText('Only 1 left')).toBeVisible();
    expect(within(truck).getByText(/2024 · Petrol/)).toBeVisible();
    expect(screen.getByText('2 vehicles')).toBeVisible();
  });

  it('shows a loading state while the catalogue is being fetched', async () => {
    server.use(
      http.get('*/api/vehicles', async () => {
        await delay(150);
        return HttpResponse.json(pageOf([makeVehicle()]));
      }),
    );
    renderRoute('/');

    expect(await screen.findByText('Loading vehicles…')).toBeInTheDocument();
    expect(await screen.findByRole('article')).toBeVisible();
    expect(screen.queryByText('Loading vehicles…')).not.toBeInTheDocument();
  });

  it('explains an empty showroom', async () => {
    renderRoute('/');

    expect(await screen.findByRole('heading', { name: /the showroom is empty/i })).toBeVisible();
  });

  it('offers to clear filters when nothing matches them', async () => {
    const { last } = captureCatalogueRequests();
    const { user } = renderRoute('/?category=VAN');

    expect(await screen.findByRole('heading', { name: /no vehicles match/i })).toBeVisible();
    await user.click(screen.getByRole('button', { name: /clear all filters/i }));

    await waitFor(() => expect(last().pathname).toBe('/api/vehicles'));
    expect(last().searchParams.get('category')).toBeNull();
  });

  it('shows an error with a working retry when the API fails', async () => {
    server.use(
      http.get('*/api/vehicles', () =>
        HttpResponse.json(errorBody('INTERNAL_ERROR', 'An unexpected error occurred'), {
          status: 500,
        }),
      ),
    );
    const { user } = renderRoute('/');

    expect(
      await screen.findByRole('heading', { name: /couldn’t load the showroom/i }),
    ).toBeVisible();

    server.use(http.get('*/api/vehicles', () => HttpResponse.json(pageOf([makeVehicle()]))));
    await user.click(screen.getByRole('button', { name: /try again/i }));

    expect(await screen.findByRole('article')).toBeVisible();
  });

  it('searches by free text using the search endpoint and keeps it in the URL', async () => {
    const { last } = captureCatalogueRequests(() =>
      HttpResponse.json(pageOf([makeVehicle({ model: 'Camry' })])),
    );
    const { user, location } = renderRoute('/');

    await user.type(await screen.findByRole('searchbox', { name: /search vehicles/i }), 'camry');

    await waitFor(() => expect(last().pathname).toBe('/api/vehicles/search'));
    expect(last().searchParams.get('q')).toBe('camry');
    expect(location()).toBe('/?q=camry');
  });

  it('filters by category', async () => {
    const { last } = captureCatalogueRequests();
    const { user } = renderRoute('/');

    const categories = await screen.findByRole('group', { name: /category/i });
    await user.click(within(categories).getByRole('button', { name: 'SUV' }));

    await waitFor(() => expect(last().searchParams.get('category')).toBe('SUV'));
    expect(within(categories).getByRole('button', { name: 'SUV' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('filters by price range and stock availability', async () => {
    const { last } = captureCatalogueRequests();
    const { user } = renderRoute('/');

    await user.type(await screen.findByLabelText(/min price/i), '30000');
    await user.type(screen.getByLabelText(/max price/i), '50000');
    await user.click(screen.getByRole('checkbox', { name: /in stock only/i }));

    await waitFor(() => {
      const params = last().searchParams;
      expect(params.get('minPrice')).toBe('30000');
      expect(params.get('maxPrice')).toBe('50000');
      expect(params.get('inStock')).toBe('true');
    });
  });

  it('warns about an impossible price range instead of sending it', async () => {
    const { requests } = captureCatalogueRequests();
    const { user } = renderRoute('/');

    await user.type(await screen.findByLabelText(/min price/i), '50000');
    await user.type(screen.getByLabelText(/max price/i), '1000');

    expect(await screen.findByText(/max price must be at least the min price/i)).toBeVisible();
    expect(requests.some((url) => url.searchParams.get('maxPrice') === '1000')).toBe(false);
  });

  it('sorts results', async () => {
    const { last } = captureCatalogueRequests();
    const { user } = renderRoute('/');

    await user.selectOptions(await screen.findByLabelText(/sort by/i), 'price_asc');

    await waitFor(() => expect(last().searchParams.get('sort')).toBe('price_asc'));
  });

  it('paginates', async () => {
    const { last } = captureCatalogueRequests(() =>
      HttpResponse.json(
        pageOf([makeVehicle()], { page: 1, pageSize: 12, total: 20, totalPages: 2 }),
      ),
    );
    const { user } = renderRoute('/');

    const pagination = await screen.findByRole('navigation', { name: /pagination/i });
    expect(within(pagination).getByText('Page 1 of 2')).toBeVisible();
    expect(within(pagination).getByRole('button', { name: /previous/i })).toBeDisabled();

    await user.click(within(pagination).getByRole('button', { name: /next/i }));

    await waitFor(() => expect(last().searchParams.get('page')).toBe('2'));
  });

  it('restores filters from the URL', async () => {
    const { last } = captureCatalogueRequests();
    renderRoute('/?q=bmw&category=SUV&sort=price_desc&inStock=true');

    await waitFor(() => expect(last().pathname).toBe('/api/vehicles/search'));
    expect(Object.fromEntries(last().searchParams)).toMatchObject({
      q: 'bmw',
      category: 'SUV',
      sort: 'price_desc',
      inStock: 'true',
    });
    expect(screen.getByRole('searchbox', { name: /search vehicles/i })).toHaveValue('bmw');
    expect(screen.getByRole('checkbox', { name: /in stock only/i })).toBeChecked();
  });
});
