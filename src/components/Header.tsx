import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  ChevronDown,
  Menu,
  Moon,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Sun,
  User,
  X,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { CATALOGUE_CATEGORIES } from '../data/products';
import { BrandNibLogo } from './BrandIcons';

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
    demoUser,
    setIsAuthModalOpen,
  } = useStore();

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

  return (
    <header
      className={`sticky top-0 z-40 w-full transition-all duration-200 border-b ${
        scrolled
          ? 'bg-white/90 dark:bg-[#050505]/90 backdrop-blur-xl border-accent/50 shadow-[0_6px_30px_-14px_rgba(var(--accent-rgb),0.45)]'
          : 'bg-white/75 dark:bg-[#050505]/75 backdrop-blur-md border-accent/35'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-[72px] flex items-center justify-between gap-4 lg:gap-8">
        {/* Left: Original Logo + Brand Name */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-full border border-accent/35 text-[var(--text-main)] hover:border-accent transition-colors"
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <button
            type="button"
            onClick={() => {
              navigate('home');
              setMobileOpen(false);
            }}
            className="flex items-center gap-2.5 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-lg py-1"
          >
            <BrandNibLogo className="w-8 h-8 transition-transform duration-200 group-hover:scale-105" />
            <span className="font-display text-lg sm:text-xl font-bold tracking-tight whitespace-nowrap">
              <span className="text-[var(--text-main)]">Arefin&apos;s </span>
              <span className="text-accent">Pen</span>
            </span>
          </button>
        </div>

        {/* Center: Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-7 text-sm font-medium" aria-label="Primary">
          <button
            type="button"
            onClick={() => navigate('home')}
            className={`relative py-2 whitespace-nowrap transition-colors ${
              isNavActive('home')
                ? 'text-[var(--text-main)] font-semibold'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-main)]'
            }`}
          >
            Home
            {isNavActive('home') && (
              <span className="absolute inset-x-0 -bottom-0.5 h-[2px] rounded-full bg-accent shadow-[0_0_10px_var(--accent-primary)]" />
            )}
          </button>

          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setCatOpen((prev) => !prev)}
              aria-expanded={catOpen}
              className={`relative py-2 inline-flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                isNavActive('categories')
                  ? 'text-[var(--text-main)] font-semibold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-main)]'
              }`}
            >
              <span>Categories</span>
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-200 ${
                  catOpen ? 'rotate-180 text-accent' : ''
                }`}
              />
              {isNavActive('categories') && (
                <span className="absolute inset-x-0 -bottom-0.5 h-[2px] rounded-full bg-accent shadow-[0_0_10px_var(--accent-primary)]" />
              )}
            </button>

            {catOpen && (
              <div
                className="absolute left-0 mt-3 w-60 rounded-2xl border border-accent/40 bg-white dark:bg-[var(--bg-input)] shadow-[0_20px_50px_-15px_rgba(0,0,0,0.75)] p-2 z-50"
                role="menu"
              >
                {CATALOGUE_CATEGORIES.map((cat) => {
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
                      className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm flex items-center justify-between transition-colors ${
                        active
                          ? 'bg-accent/15 text-accent font-semibold'
                          : 'text-[var(--text-secondary)] hover:bg-accent/10 hover:text-[var(--text-main)]'
                      }`}
                    >
                      <span>{cat.label}</span>
                      <ArrowRight className="w-3.5 h-3.5 opacity-60" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => navigate('track-order')}
            className={`relative py-2 whitespace-nowrap transition-colors ${
              isNavActive('track-order')
                ? 'text-[var(--text-main)] font-semibold'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-main)]'
            }`}
          >
            Track Order
            {isNavActive('track-order') && (
              <span className="absolute inset-x-0 -bottom-0.5 h-[2px] rounded-full bg-accent shadow-[0_0_10px_var(--accent-primary)]" />
            )}
          </button>

          <button
            type="button"
            onClick={() => navigate('about')}
            className={`relative py-2 whitespace-nowrap transition-colors ${
              isNavActive('about')
                ? 'text-[var(--text-main)] font-semibold'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-main)]'
            }`}
          >
            About
            {isNavActive('about') && (
              <span className="absolute inset-x-0 -bottom-0.5 h-[2px] rounded-full bg-accent shadow-[0_0_10px_var(--accent-primary)]" />
            )}
          </button>

          <button
            type="button"
            onClick={() => navigate('contact')}
            className={`relative py-2 whitespace-nowrap transition-colors ${
              isNavActive('contact')
                ? 'text-[var(--text-main)] font-semibold'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-main)]'
            }`}
          >
            Contact
            {isNavActive('contact') && (
              <span className="absolute inset-x-0 -bottom-0.5 h-[2px] rounded-full bg-accent shadow-[0_0_10px_var(--accent-primary)]" />
            )}
          </button>
        </nav>

        {/* Right: Brightness, Settings, Admin immediately beside Settings, User, Login/Register, Cart */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
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
            className="relative w-10 h-10 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-main)] hover:border-accent hover:text-accent-bright inline-flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            aria-label={`Shopping cart with ${cartCount} items`}
          >
            <ShoppingCart className="w-[18px] h-[18px]" />
            <span
              className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-accent text-[var(--accent-cta-text)] text-[11px] font-bold font-mono-num flex items-center justify-center shadow-[0_0_10px_rgba(var(--accent-rgb),0.75)] transition-transform duration-150"
              key={cartCount}
            >
              {cartCount}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-accent/30 bg-white dark:bg-[var(--bg-secondary)] px-4 py-4 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                navigate('home');
                setMobileOpen(false);
              }}
              className={`px-3.5 py-2.5 rounded-xl text-left text-sm font-medium ${
                route === 'home'
                  ? 'bg-accent/15 text-accent border border-accent/40'
                  : 'text-[var(--text-main)] hover:bg-accent/10'
              }`}
            >
              Home
            </button>
            <button
              type="button"
              onClick={() => {
                navigate('shop', { category: 'all' });
                setMobileOpen(false);
              }}
              className={`px-3.5 py-2.5 rounded-xl text-left text-sm font-medium ${
                route === 'shop'
                  ? 'bg-accent/15 text-accent border border-accent/40'
                  : 'text-[var(--text-main)] hover:bg-accent/10'
              }`}
            >
              All Pens
            </button>
            <button
              type="button"
              onClick={() => {
                navigate('track-order');
                setMobileOpen(false);
              }}
              className={`px-3.5 py-2.5 rounded-xl text-left text-sm font-medium ${
                route === 'track-order'
                  ? 'bg-accent/15 text-accent border border-accent/40'
                  : 'text-[var(--text-main)] hover:bg-accent/10'
              }`}
            >
              Track Order
            </button>
            <button
              type="button"
              onClick={() => {
                navigate('about');
                setMobileOpen(false);
              }}
              className={`px-3.5 py-2.5 rounded-xl text-left text-sm font-medium ${
                route === 'about'
                  ? 'bg-accent/15 text-accent border border-accent/40'
                  : 'text-[var(--text-main)] hover:bg-accent/10'
              }`}
            >
              About
            </button>
            <button
              type="button"
              onClick={() => {
                navigate('contact');
                setMobileOpen(false);
              }}
              className={`px-3.5 py-2.5 rounded-xl text-left text-sm font-medium ${
                route === 'contact'
                  ? 'bg-accent/15 text-accent border border-accent/40'
                  : 'text-[var(--text-main)] hover:bg-accent/10'
              }`}
            >
              Contact
            </button>
            <button
              type="button"
              onClick={() => {
                navigate('cart');
                setMobileOpen(false);
              }}
              className="px-3.5 py-2.5 rounded-xl text-left text-sm font-medium text-[var(--text-main)] hover:bg-accent/10"
            >
              View Cart ({cartCount})
            </button>
          </div>

          <div className="pt-2 border-t border-[var(--border-subtle)]">
            <p className="text-xs font-medium text-[var(--text-muted)] mb-2 px-1">
              Browse Categories
            </p>
            <div className="flex flex-wrap gap-1.5">
              {CATALOGUE_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    navigate('shop', { category: cat.id });
                    setMobileOpen(false);
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-accent hover:text-[var(--text-main)]"
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                setIsAuthModalOpen(true);
              }}
              className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold cta-glow-red flex items-center justify-center gap-2"
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
