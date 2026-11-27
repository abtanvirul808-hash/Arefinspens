import React, { useState } from 'react';
import { ArrowRight, CheckCircle2, Facebook, Instagram, Youtube } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { STORE_CONFIG } from '../data/storeConfig';
import { BrandMartLogo } from './BrandIcons';
import { FadeUp } from './FadeUp';

export const Footer: React.FC = () => {
  const { navigate, showToast } = useStore();
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [error, setError] = useState('');

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Please enter a valid email address.');
      return;
    }
    setError('');
    setSubscribed(true);
    setEmail('');
    showToast('Newsletter preference saved (demo mode)');
  };

  return (
    <footer className="relative z-10 mt-14 sm:mt-20 border-t border-accent/35 bg-gradient-to-b from-[var(--footer-top)] via-[#0B0809] to-[#050505] text-white">
      <div className="section-hairline w-full" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 lg:py-16">
        <FadeUp>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Column 1: Brand */}
          <div className="space-y-4">
            <a
              href="#/"
              onClick={(e) => {
                e.preventDefault();
                navigate('home', { scrollToTop: true });
              }}
              aria-label="Arefin Mart — Go to Home"
              title="Go to Home"
              className="inline-flex items-center gap-2.5 text-left group cursor-pointer rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <BrandMartLogo
                iconClassName="w-10 h-9"
                className="transition-transform duration-200 group-hover:scale-105"
              />
              <span className="font-display text-xl font-bold tracking-tight">
                <span className="text-white group-hover:text-accent transition-colors">Arefin </span>
                <span className="text-accent">Mart</span>
              </span>
            </a>
            <p className="text-sm text-[#B8B8B8] leading-relaxed max-w-xs">
              Curated writing instruments and everyday essentials for students, educators, artists,
              and shoppers in Sylhet Uposhahr.
            </p>
            <div className="flex items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => navigate('contact')}
                className="w-9 h-9 rounded-full border border-accent/40 bg-black/40 text-[#B8B8B8] hover:text-white hover:border-accent inline-flex items-center justify-center transition-colors"
                aria-label="Facebook page inquiry"
              >
                <Facebook className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => navigate('contact')}
                className="w-9 h-9 rounded-full border border-accent/40 bg-black/40 text-[#B8B8B8] hover:text-white hover:border-accent inline-flex items-center justify-center transition-colors"
                aria-label="Instagram showcase inquiry"
              >
                <Instagram className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => navigate('contact')}
                className="w-9 h-9 rounded-full border border-accent/40 bg-black/40 text-[#B8B8B8] hover:text-white hover:border-accent inline-flex items-center justify-center transition-colors"
                aria-label="YouTube stationery reviews inquiry"
              >
                <Youtube className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div>
            <h3 className="font-display text-sm font-semibold text-white mb-4">Quick Links</h3>
            <ul className="space-y-2.5 text-sm text-[#B8B8B8]">
              <li>
                <button
                  type="button"
                  onClick={() => navigate('home')}
                  className="hover:text-accent-bright transition-colors"
                >
                  Home
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigate('shop', { category: 'all' })}
                  className="hover:text-accent-bright transition-colors"
                >
                  All Products
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigate('shop', { category: 'all-pens' })}
                  className="hover:text-accent-bright transition-colors"
                >
                  All Pens
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigate('about')}
                  className="hover:text-accent-bright transition-colors"
                >
                  About Us
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigate('contact')}
                  className="hover:text-accent-bright transition-colors"
                >
                  Contact
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: Customer Support */}
          <div>
            <h3 className="font-display text-sm font-semibold text-white mb-4">
              Customer Support
            </h3>
            <ul className="space-y-2.5 text-sm text-[#B8B8B8]">
              <li>
                <button
                  type="button"
                  onClick={() => navigate('track-order')}
                  className="hover:text-accent-bright transition-colors"
                >
                  Your Order
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigate('info', { infoTopic: 'shipping' })}
                  className="hover:text-accent-bright transition-colors"
                >
                  Shopping Information
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigate('info', { infoTopic: 'returns' })}
                  className="hover:text-accent-bright transition-colors"
                >
                  Return Policy
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigate('info', { infoTopic: 'privacy' })}
                  className="hover:text-accent-bright transition-colors"
                >
                  Privacy Policy
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigate('info', { infoTopic: 'terms' })}
                  className="hover:text-accent-bright transition-colors"
                >
                  Terms and Conditions
                </button>
              </li>
            </ul>
          </div>

          {/* Column 4: Newsletter */}
          <div className="space-y-3">
            <h3 className="font-display text-sm font-semibold text-white">Stay in the Loop</h3>
            <p className="text-sm text-[#B8B8B8] leading-relaxed">
              Get updates about new arrivals and special offers.
            </p>
            <form onSubmit={handleSubscribe} className="space-y-2.5" noValidate>
              <label htmlFor="footer-newsletter-email" className="sr-only">
                Email address
              </label>
              <div className="flex flex-col sm:flex-row lg:flex-col gap-2">
                <input
                  id="footer-newsletter-email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="you@example.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0809] border border-accent/35 text-sm text-white placeholder-[#858585] focus:outline-none focus:border-accent-bright"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold cta-glow-red inline-flex items-center justify-center gap-2 transition-all whitespace-nowrap"
                >
                  <span>Subscribe</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
              {error && <p className="text-xs text-accent-bright">{error}</p>}
              {subscribed && (
                <p className="text-xs text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Subscribed for demo preview updates.</span>
                </p>
              )}
            </form>
            <p className="text-xs text-[#858585]">
              {STORE_CONFIG.contact.email}
            </p>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#858585]">
          <p>&copy; 2026 Arefin Mart. All rights reserved.</p>
          <p>Currency: Bangladeshi Taka (৳ BDT) · Delivery: Sylhet Uposhahr Only</p>
        </div>
        </FadeUp>
      </div>
    </footer>
  );
};
