/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { StoreProvider, useStore } from './context/StoreContext';
import { BackgroundCurves } from './components/BackgroundCurves';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import {
  AuthModal,
  CartDrawer,
  SettingsPanel,
  ToastBanner,
} from './components/StoreOverlays';
import { AdminModal } from './components/AdminModal';
import { SearchOverlay } from './components/SearchOverlay';
import { HomePage } from './pages/HomePage';
import { CataloguePage } from './pages/CataloguePage';
import { ProductDetailsPage } from './pages/ProductDetailsPage';
import { CartPage } from './pages/CartPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { TrackOrderPage } from './pages/TrackOrderPage';
import { AboutPage, ContactPage, InfoPage } from './pages/SecondaryPages';

const StorefrontShell: React.FC = () => {
  const { route } = useStore();

  const renderPage = () => {
    switch (route) {
      case 'shop':
        return <CataloguePage />;
      case 'product':
        return <ProductDetailsPage />;
      case 'cart':
        return <CartPage />;
      case 'checkout':
        return <CheckoutPage />;
      case 'track-order':
        return <TrackOrderPage />;
      case 'about':
        return <AboutPage />;
      case 'contact':
        return <ContactPage />;
      case 'info':
        return <InfoPage />;
      case 'home':
      default:
        return <HomePage />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-main)] text-[var(--text-main)] relative overflow-x-clip transition-colors duration-200">
      <BackgroundCurves />
      <Header />
      <main className="flex-1 relative z-10">{renderPage()}</main>
      <Footer />
      <CartDrawer />
      <SettingsPanel />
      <AuthModal />
      <AdminModal />
      <SearchOverlay />
      <ToastBanner />
    </div>
  );
};

export default function App() {
  return (
    <StoreProvider>
      <StorefrontShell />
    </StoreProvider>
  );
}
