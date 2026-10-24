import { Route, Routes } from 'react-router';
import { AppLayout } from '../layouts/AppLayout';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { NotFoundPage } from '../pages/StatusPages';
import { GuestOnly, RequireAdmin } from './guards';

function CataloguePlaceholder() {
  return <h1 className="p-8 text-3xl font-semibold">Showroom</h1>;
}

function AdminPlaceholder() {
  return <h1 className="p-8 text-3xl font-semibold">Inventory</h1>;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<CataloguePlaceholder />} />
        <Route element={<GuestOnly />}>
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
        </Route>
        <Route path="admin" element={<RequireAdmin />}>
          <Route index element={<AdminPlaceholder />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
