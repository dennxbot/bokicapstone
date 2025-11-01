
import type { RouteObject } from 'react-router-dom';
import { lazy } from 'react';

// Lazy load components
const Home = lazy(() => import('../pages/home/page'));
const Menu = lazy(() => import('../pages/menu/page'));
const Cart = lazy(() => import('../pages/cart/page'));
const Checkout = lazy(() => import('../pages/checkout/page'));
const FoodDetails = lazy(() => import('../pages/food-details/page'));
const Login = lazy(() => import('../pages/login/page'));
const Signup = lazy(() => import('../pages/signup/page'));
const Orders = lazy(() => import('../pages/orders/page'));
const OrderDetails = lazy(() => import('../pages/order-details/page'));
const OrderConfirmation = lazy(() => import('../pages/order-confirmation/page'));
const Profile = lazy(() => import('../pages/profile/page'));
const Favorites = lazy(() => import('../pages/favorites/page'));
const NotFound = lazy(() => import('../pages/NotFound'));

// Admin pages
const AdminDashboard = lazy(() => import('../pages/admin/dashboard/page'));
const AdminMenu = lazy(() => import('../pages/admin/menu/page'));
const AdminOrders = lazy(() => import('../pages/admin/orders/page'));
const AdminCashier = lazy(() => import('../pages/admin/cashier/page'));
const AdminCustomers = lazy(() => import('../pages/admin/customers/page'));
const AdminReports = lazy(() => import('../pages/admin/reports/page'));
const AdminCategories = lazy(() => import('../pages/admin/categories/page'));
const AdminSizes = lazy(() => import('../pages/admin/sizes/page'));
const AdminNotifications = lazy(() => import('../pages/admin/notifications/page'));

// Kiosk page
const KioskPage = lazy(() => import('../pages/kiosk/page'));

const routes: RouteObject[] = [
  {
    path: '/',
    element: <Home />,
  },
  {
    path: '/menu',
    element: <Menu />,
  },
  {
    path: '/cart',
    element: <Cart />,
  },
  {
    path: '/checkout',
    element: <Checkout />,
  },
  {
    path: '/food/:id',
    element: <FoodDetails />,
  },
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/signup',
    element: <Signup />,
  },
  {
    path: '/orders',
    element: <Orders />,
  },
  {
    path: '/orders/:id',
    element: <OrderDetails />,
  },
  {
    path: '/order/:id',
    element: <OrderConfirmation />,
  },
  {
    path: '/order-confirmation/:id',
    element: <OrderConfirmation />,
  },
  {
    path: '/profile',
    element: <Profile />,
  },
  {
    path: '/favorites',
    element: <Favorites />,
  },
  {
    path: '/admin',
    element: <AdminDashboard />,
  },
  {
    path: '/admin/menu',
    element: <AdminMenu />,
  },
  {
    path: '/admin/categories',
    element: <AdminCategories />,
  },
  {
    path: '/admin/sizes',
    element: <AdminSizes />,
  },
  {
    path: '/admin/orders',
    element: <AdminOrders />,
  },
  {
    path: '/admin/cashier',
    element: <AdminCashier />,
  },
  {
    path: '/admin/customers',
    element: <AdminCustomers />,
  },
  {
    path: '/admin/reports',
    element: <AdminReports />,
  },
  {
    path: '/admin/notifications',
    element: <AdminNotifications />,
  },
  {
    path: '/kiosk',
    element: <KioskPage />,
  },
  {
    path: '*',
    element: <NotFound />,
  },
];

export default routes;
