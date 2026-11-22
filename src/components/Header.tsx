import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  ChevronDown,
  Home,
  Info,
  LayoutGrid,
  Menu,
  Moon,
  Package,
  Phone,
  Search,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Sun,
  User,
  X,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { isOtherProduct, PEN_CATEGORIES } from '../data/products';
import { BrandMartLogo, CategoryVectorIcon } from './BrandIcons';

export const Header: React.FC = () => {
  const {
    route,
    selectedCategory,
    navigate,
    cartCount,
    setIsCartDrawerOpen,
    preferences,
    toggleTheme,
    isSettingsOpen,
    setIsSettingsOpen,
    isAdmin,
    isAdminModalOpen,
    setIsAdminModalOpen,
    isSearchOpen,
    setIsSearchOpen,
    demoUser,
    setIsAuthModalOpen,
    products,
  } = useStore();

  const otherCount = products.filter((p) => isOtherProduct(p)).length;

  const [scrolled, setScrolled] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setCatOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const isNavActive = (target: string) => {
    if (target === 'home') return route === 'home';
    if (target === 'categories') return route === 'shop' || route === 'product';
    return route === target;
  };

  const handleGoHome = (e?: React.MouseEvent) => {
    e?.preventDefault();
    setMobileOpen(false);
    setCatOpen(false);
    setIsSearchOpen(false);
    setIsCartDrawerOpen(false);
    setIsSettingsOpen(false);
    setIsAdminModalOpen(false);
    setIsAuthModalOpen(false);
    navigate('home', { scrollToTop: true });
  };

  return (
    <header
      className={`sticky top-0 z-40 w-full transition-all duration-200 border-b ${
        scrolled
          ? 'bg-white/90 dark:bg-[#050505]/90 backdrop-blur-xl border-accent/50 shadow-[0_6px_30px_-14px_rgba(var(--accent-rgb),0.45)]'
          : 'bg-white/75 dark:bg-[#050505]/75 backdrop-blur-md border-accent/35'
      }`}
    >
      <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8 h-16 sm:h-[72px] flex items-center justify-between gap-1.5 sm:gap-4 lg:gap-8">
        {/* Left: Original Logo + Brand Name */}
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 shrink-0">
          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            className="lg:hidden inline-flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-accent/35 text-[var(--text-main)] hover:border-accent transition-colors shrink-0"
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <a
            href="#/"
            onClick={handleGoHome}
            aria-label="Arefin Mart — Go to Home"
            title="Go to Home"
            className="flex items-center gap-1.5 sm:gap-2.5 group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-lg py-1 min-w-0"
          >
            <BrandMartLogo
              iconClassName="w-7 h-7 sm:w-11 sm:h-10"
              className="transition-transform duration-200 group-hover:scale-105"
            />
            <span className="font-display text-[15px] sm:text-xl font-bold tracking-tight whitespace-nowrap">
              <span className="text-[var(--text-main)] group-hover:text-accent transition-colors">Arefin </span>
              <span className="text-accent">Mart</span>
            </span>
          </a>
        </div>

        {/* Center: Unified Frosted Liquid Glass Navigation Dock */}
        <nav
          className="hidden lg:flex items-center gap-1 liquid-glass-dock text-sm font-medium"
          aria-label="Primary"
        >
          <button
            type="button"
            onClick={() => navigate('home')}
            className={`liquid-glass-item px-3 xl:px-4 py-1.5 inline-flex items-center justify-center gap-1.5 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
              isNavActive('home') ? 'liquid-glass-item-active' : ''
            }`}
          >
            <Home className="w-3.5 h-3.5 shrink-0" />
            <span>Home</span>
          </button>

          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setCatOpen((prev) => !prev)}
              aria-expanded={catOpen}
              className={`liquid-glass-item px-3 xl:px-4 py-1.5 inline-flex items-center justify-center gap-1.5 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                isNavActive('categories') || catOpen ? 'liquid-glass-item-active' : ''
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5 shrink-0" />
              <span>Categories</span>
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-200 ${
                  catOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {catOpen && (
              <div
                className="liquid-glass-menu absolute left-0 mt-3 w-72 p-2.5 z-50 space-y-2"
                role="menu"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2 px-3 py-1.5 mb-1.5 rounded-xl bg-accent/15 border border-accent/55 shadow-[0_0_14px_rgba(var(--accent-rgb),0.24)]">
                    <span className="inline-flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wider text-accent dark:text-accent-bright">
                      <CategoryVectorIcon category="all-pens" className="w-3.5 h-3.5 shrink-0" />
                      <span>Pens</span>
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wide text-accent dark:text-accent-bright opacity-90">
                      Collection
                    </span>
                  </div>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setCatOpen(false);
                      navigate('shop', { category: 'all-pens' });
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-sm flex items-center justify-between gap-2 transition-colors ${
                      route === 'shop' && selectedCategory === 'all-pens'
                        ? 'bg-accent/20 text-accent font-semibold border border-accent/35'
                        : 'text-[var(--text-secondary)] hover:bg-accent/10 hover:text-[var(--text-main)]'
                    }`}
                  >
                    <span className="inline-flex items-center gap-2.5 min-w-0">
                      <CategoryVectorIcon category="all-pens" className="w-4 h-4 text-accent dark:text-accent-bright shrink-0" />
                      <span className="truncate">All Pens</span>
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 opacity-60 shrink-0" />
                  </button>
                  {PEN_CATEGORIES.map((cat) => {
                    const active = route === 'shop' && selectedCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setCatOpen(false);
                          navigate('shop', { category: cat.id });
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl text-sm flex items-center justify-between gap-2 transition-colors ${
                          active
                            ? 'bg-accent/20 text-accent font-semibold border border-accent/35'
                            : 'text-[var(--text-secondary)] hover:bg-accent/10 hover:text-[var(--text-main)]'
                        }`}
                      >
                        <span className="inline-flex items-center gap-2.5 min-w-0">
                          <CategoryVectorIcon category={cat.id} className="w-4 h-4 text-accent dark:text-accent-bright shrink-0" />
                          <span className="truncate">{cat.label}</span>
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 opacity-60 shrink-0" />
                      </button>
                    );
                  })}
                </div>

                <div className="pt-2 border-t border-[var(--border-subtle)]/70 space-y-1">
                  <div className="flex items-center justify-between gap-2 px-3 py-1.5 mb-1.5 rounded-xl bg-accent/15 border border-accent/55 shadow-[0_0_14px_rgba(var(--accent-rgb),0.24)]">
                    <span className="inline-flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wider text-accent dark:text-accent-bright">
                      <CategoryVectorIcon category="other-products" className="w-3.5 h-3.5 shrink-0" />
                      <span>Other</span>
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wide text-accent dark:text-accent-bright opacity-90">
                      {otherCount > 0 ? `${otherCount} Items` : 'Soon'}
                    </span>
                  </div>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setCatOpen(false);
                      navigate('shop', { category: 'other-products' });
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-sm flex items-center justify-between gap-2 transition-colors ${
                      route === 'shop' && selectedCategory === 'other-products'
                        ? 'bg-accent/20 text-accent font-semibold border border-accent/35'
                        : 'text-[var(--text-secondary)] hover:bg-accent/10 hover:text-[var(--text-main)]'
                    }`}
                  >
                    <span className="inline-flex items-center gap-2.5 min-w-0">
                      <CategoryVectorIcon category="other-products" className="w-4 h-4 text-accent dark:text-accent-bright shrink-0" />
                      <span className="truncate">
                        {otherCount > 0 ? 'Other Products' : 'Coming Soon'}
                      </span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 shrink-0">
                      {otherCount === 0 ? (
                        <span className="px-1.5 py-0.5 rounded bg-accent/15 border border-accent/40 text-[10px] font-bold text-accent dark:text-accent-bright">
                          Soon
                        </span>
                      ) : (
                        <span className="text-[11px] font-mono-num text-[var(--text-muted)]">
                          {otherCount}
                        </span>
                      )}
                      <ArrowRight className="w-3.5 h-3.5 opacity-60" />
                    </span>
                  </button>
                </div>

                <div className="pt-1.5 border-t border-[var(--border-subtle)]/70">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setCatOpen(false);
                      navigate('shop', { category: 'all' });
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                      route === 'shop' && selectedCategory === 'all'
                        ? 'bg-accent/20 text-accent border border-accent/35'
                        : 'text-[var(--text-main)] hover:bg-accent/10'
                    }`}
                  >
                    <span className="inline-flex items-center gap-2.5 min-w-0">
                      <CategoryVectorIcon category="all" className="w-4 h-4 text-accent dark:text-accent-bright shrink-0" />
                      <span>Browse All Products</span>
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 opacity-60 shrink-0" />
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => navigate('track-order')}
            className={`liquid-glass-item px-3 xl:px-4 py-1.5 inline-flex items-center justify-center gap-1.5 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
              isNavActive('track-order') ? 'liquid-glass-item-active' : ''
            }`}
          >
            <Package className="w-3.5 h-3.5 shrink-0" />
            <span>Your Order</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('about')}
            className={`liquid-glass-item px-3 xl:px-4 py-1.5 inline-flex items-center justify-center gap-1.5 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
              isNavActive('about') ? 'liquid-glass-item-active' : ''
            }`}
          >
            <Info className="w-3.5 h-3.5 shrink-0" />
            <span>About</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('contact')}
            className={`liquid-glass-item px-3 xl:px-4 py-1.5 inline-flex items-center justify-center gap-1.5 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
              isNavActive('contact') ? 'liquid-glass-item-active' : ''
            }`}
          >
            <Phone className="w-3.5 h-3.5 shrink-0" />
            <span>Contact</span>
          </button>
        </nav>

        {/* Right: Search, Brightness, Settings, Admin, User, Login/Register, Cart */}
        <div className="flex items-center gap-1 sm:gap-2.5 shrink-0">
          {/* Intelligent Search Trigger */}
          <button
            type="button"
            onClick={() => setIsSearchOpen(true)}
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full border bg-[var(--bg-card)] inline-flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
              isSearchOpen
                ? 'border-accent text-accent-bright'
                : 'border-[var(--border-subtle)] text-[var(--text-main)] hover:border-accent hover:text-accent-bright'
            }`}
            aria-label="Open intelligent product search"
            aria-expanded={isSearchOpen}
            title="Search Products (Ctrl+K)"
          >
            <Search className="w-[17px] h-[17px] sm:w-[18px] sm:h-[18px]" />
          </button>

          {/* Brightness / Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-main)] hover:border-accent hover:text-accent-bright inline-flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            aria-label={
              preferences.theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'
            }
            title={preferences.theme === 'dark' ? 'Light theme' : 'Dark theme'}
          >
            {preferences.theme === 'dark' ? (
              <Sun className="w-[17px] h-[17px] sm:w-[18px] sm:h-[18px]" />
            ) : (
              <Moon className="w-[17px] h-[17px] sm:w-[18px] sm:h-[18px]" />
            )}
          </button>

          {/* Settings Icon immediately beside Brightness Icon */}
          <button
            type="button"
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full border bg-[var(--bg-card)] inline-flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
              isSettingsOpen
                ? 'border-accent text-accent-bright'
                : 'border-[var(--border-subtle)] text-[var(--text-main)] hover:border-accent hover:text-accent-bright'
            }`}
            aria-label="Open display and accessibility settings"
            aria-expanded={isSettingsOpen}
            title="Display Settings"
          >
            <Settings className="w-[17px] h-[17px] sm:w-[18px] sm:h-[18px]" />
          </button>

          {/* Admin Portal Icon immediately beside Settings Icon */}
          <button
            type="button"
            onClick={() => setIsAdminModalOpen(true)}
            className={`relative w-9 h-9 sm:w-10 sm:h-10 rounded-full border bg-[var(--bg-card)] inline-flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
              isAdminModalOpen || isAdmin
                ? 'border-accent text-accent-bright'
                : 'border-[var(--border-subtle)] text-[var(--text-main)] hover:border-accent hover:text-accent-bright'
            }`}
            aria-label="Open admin order panel"
            aria-expanded={isAdminModalOpen}
            title={isAdmin ? 'Admin Order Panel (Signed in)' : 'Admin Login'}
          >
            <ShieldCheck className="w-[17px] h-[17px] sm:w-[18px] sm:h-[18px]" />
            {isAdmin && (
              <span
                className="absolute top-0.5 right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-[var(--bg-card)]"
                aria-hidden="true"
              />
            )}
          </button>

          {/* User Profile Icon */}
          <button
            type="button"
            onClick={() => setIsAuthModalOpen(true)}
            className="hidden sm:inline-flex w-10 h-10 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-main)] hover:border-accent hover:text-accent-bright items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            aria-label="Account profile"
            title={demoUser ? `Signed in: ${demoUser.name}` : 'Account'}
          >
            <User className="w-[18px] h-[18px]" />
          </button>

          {/* Login / Register Button */}
          <button
            type="button"
            onClick={() => setIsAuthModalOpen(true)}
            className="hidden md:inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold cta-glow-red transition-all whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-bright"
          >
            <span>{demoUser ? demoUser.name.split(' ')[0] : 'Login / Register'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          {/* Shopping Cart Icon with Live Accent Counter */}
          <button
            type="button"
            onClick={() => setIsCartDrawerOpen(true)}
            className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-main)] hover:border-accent hover:text-accent-bright inline-flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            aria-label={`Shopping cart with ${cartCount} items`}
          >
            <ShoppingCart className="w-[17px] h-[17px] sm:w-[18px] sm:h-[18px]" />
            <span
              className="absolute -top-1 -right-1 min-w-[19px] sm:min-w-[20px] h-[19px] sm:h-5 px-1 rounded-full bg-accent text-[var(--accent-cta-text)] text-[10px] sm:text-[11px] font-bold font-mono-num flex items-center justify-center shadow-[0_0_10px_rgba(var(--accent-rgb),0.75)] transition-transform duration-150"
              key={cartCount}
            >
              {cartCount}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile & Tablet Navigation Drawer */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-accent/30 bg-white/95 dark:bg-[var(--bg-secondary)]/95 backdrop-blur-xl px-4 py-4 space-y-3 max-h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => {
                navigate('home');
                setMobileOpen(false);
              }}
              className={`liquid-glass-drawer-tile min-h-[44px] px-3.5 py-2.5 text-left text-sm font-medium flex items-center gap-2 ${
                route === 'home' ? 'liquid-glass-drawer-tile-active' : ''
              }`}
            >
              <Home className="w-4 h-4 shrink-0" />
              <span>Home</span>
            </button>
            <button
              type="button"
              onClick={() => {
                navigate('shop', { category: 'all-pens' });
                setMobileOpen(false);
              }}
              className={`liquid-glass-drawer-tile min-h-[44px] px-3.5 py-2.5 text-left text-sm font-medium flex items-center gap-2 ${
                route === 'shop' ? 'liquid-glass-drawer-tile-active' : ''
              }`}
            >
              <LayoutGrid className="w-4 h-4 shrink-0" />
              <span>Categories</span>
            </button>
            <button
              type="button"
              onClick={() => {
                navigate('track-order');
                setMobileOpen(false);
              }}
              className={`liquid-glass-drawer-tile min-h-[44px] px-3.5 py-2.5 text-left text-sm font-medium flex items-center gap-2 ${
                route === 'track-order' ? 'liquid-glass-drawer-tile-active' : ''
              }`}
            >
              <Package className="w-4 h-4 shrink-0" />
              <span>Your Order</span>
            </button>
            <button
              type="button"
              onClick={() => {
                navigate('about');
                setMobileOpen(false);
              }}
              className={`liquid-glass-drawer-tile min-h-[44px] px-3.5 py-2.5 text-left text-sm font-medium flex items-center gap-2 ${
                route === 'about' ? 'liquid-glass-drawer-tile-active' : ''
              }`}
            >
              <Info className="w-4 h-4 shrink-0" />
              <span>About</span>
            </button>
            <button
              type="button"
              onClick={() => {
                navigate('contact');
                setMobileOpen(false);
              }}
              className={`liquid-glass-drawer-tile min-h-[44px] px-3.5 py-2.5 text-left text-sm font-medium flex items-center gap-2 ${
                route === 'contact' ? 'liquid-glass-drawer-tile-active' : ''
              }`}
            >
              <Phone className="w-4 h-4 shrink-0" />
              <span>Contact</span>
            </button>
            <button
              type="button"
              onClick={() => {
                navigate('cart');
                setMobileOpen(false);
              }}
              className={`liquid-glass-drawer-tile min-h-[44px] px-3.5 py-2.5 text-left text-sm font-medium flex items-center gap-2 ${
                route === 'cart' ? 'liquid-glass-drawer-tile-active' : ''
              }`}
            >
              <ShoppingCart className="w-4 h-4 shrink-0" />
              <span>View Cart ({cartCount})</span>
            </button>
          </div>

          <div className="pt-2 border-t border-[var(--border-subtle)] space-y-2.5">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-accent/15 border border-accent/55 shadow-[0_0_12px_rgba(var(--accent-rgb),0.22)]">
                <CategoryVectorIcon category="all-pens" className="w-3.5 h-3.5 text-accent dark:text-accent-bright shrink-0" />
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-accent dark:text-accent-bright">
                  Pens
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    navigate('shop', { category: 'all-pens' });
                    setMobileOpen(false);
                  }}
                  className={`liquid-glass-drawer-tile min-h-[42px] px-3 py-2 text-xs font-medium inline-flex items-center gap-1.5 ${
                    route === 'shop' && selectedCategory === 'all-pens'
                      ? 'liquid-glass-drawer-tile-active'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-main)]'
                  }`}
                >
                  <CategoryVectorIcon category="all-pens" className="w-3.5 h-3.5 shrink-0" />
                  <span>All Pens</span>
                </button>
                {PEN_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      navigate('shop', { category: cat.id });
                      setMobileOpen(false);
                    }}
                    className={`liquid-glass-drawer-tile min-h-[42px] px-3 py-2 text-xs font-medium inline-flex items-center gap-1.5 ${
                      route === 'shop' && selectedCategory === cat.id
                        ? 'liquid-glass-drawer-tile-active'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-main)]'
                    }`}
                  >
                    <CategoryVectorIcon category={cat.id} className="w-3.5 h-3.5 shrink-0" />
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-accent/15 border border-accent/55 shadow-[0_0_12px_rgba(var(--accent-rgb),0.22)]">
                <CategoryVectorIcon category="other-products" className="w-3.5 h-3.5 text-accent dark:text-accent-bright shrink-0" />
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-accent dark:text-accent-bright">
                  Other
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    navigate('shop', { category: 'other-products' });
                    setMobileOpen(false);
                  }}
                  className={`liquid-glass-drawer-tile min-h-[42px] px-3 py-2 text-xs font-medium inline-flex items-center gap-1.5 ${
                    route === 'shop' && selectedCategory === 'other-products'
                      ? 'liquid-glass-drawer-tile-active'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-main)]'
                  }`}
                >
                  <CategoryVectorIcon category="other-products" className="w-3.5 h-3.5 shrink-0" />
                  <span>{otherCount > 0 ? `Other Products (${otherCount})` : 'Coming Soon'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    navigate('shop', { category: 'all' });
                    setMobileOpen(false);
                  }}
                  className={`liquid-glass-drawer-tile min-h-[42px] px-3 py-2 text-xs font-medium inline-flex items-center gap-1.5 ${
                    route === 'shop' && selectedCategory === 'all'
                      ? 'liquid-glass-drawer-tile-active'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-main)]'
                  }`}
                >
                  <CategoryVectorIcon category="all" className="w-3.5 h-3.5 shrink-0" />
                  <span>All Products</span>
                </button>
              </div>
            </div>
          </div>

          <div className="pt-2 flex items-center gap-2 pb-[env(safe-area-inset-bottom)]">
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                setIsAuthModalOpen(true);
              }}
              className="w-full min-h-[44px] py-2.5 px-4 rounded-xl text-sm font-semibold cta-glow-red flex items-center justify-center gap-2"
            >
              <User className="w-4 h-4" />
              <span>{demoUser ? `${demoUser.name} (Account)` : 'Login / Register'}</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
