import React from 'react';
import {
  ArrowRight,
  Award,
  Headphones,
  Layers,
  Quote,
  ShoppingBag,
  Sparkles,
  Star,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { HOMEPAGE_CATEGORIES, isOtherProduct } from '../data/products';
import { PRODUCT_IMAGES } from '../data/productImages';
import { SAMPLE_TESTIMONIALS } from '../data/storeConfig';
import { CategoryVectorIcon, SparkleAccentIcon } from '../components/BrandIcons';
import { ProductCard } from '../components/ProductCard';
import { SafeImage } from '../components/SafeImage';
import { FadeUp } from '../components/FadeUp';

export const HomePage: React.FC = () => {
  const { navigate, products } = useStore();
  const featuredProducts = products.filter((p) => p.featured).slice(0, 8);
  const otherProductsCount = products.filter((p) => isOtherProduct(p)).length;

  const scrollToCategories = () => {
    const el = document.getElementById('home-categories');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="relative z-10">
      {/* 1. HERO SECTION (Clean, centered, typography-focused — no pen photography in hero) */}
      <section className="relative pt-10 pb-12 sm:pt-16 sm:pb-20 lg:pt-24 lg:pb-28 px-4 sm:px-6 lg:px-8">
        <div
          className="pointer-events-none absolute inset-x-0 top-12 mx-auto w-[min(720px,90vw)] h-[320px] rounded-full opacity-30 dark:opacity-55 blur-3xl"
          style={{
            background:
              'radial-gradient(circle, rgba(var(--accent-rgb), 0.24) 0%, rgba(var(--accent-deep-rgb), 0.08) 55%, transparent 75%)',
          }}
          aria-hidden="true"
        />

        <div className="relative max-w-4xl mx-auto text-center space-y-7">
          {/* Decorative Horizontal Separator + Centered Pill */}
          <div className="flex items-center justify-center gap-4">
            <span className="hidden sm:block h-px w-20 bg-gradient-to-r from-transparent to-accent/60" />
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-accent/45 bg-white/80 dark:bg-[var(--bg-card)]/85 backdrop-blur-md shadow-[0_0_24px_rgba(var(--accent-rgb),0.16)]">
              <SparkleAccentIcon className="w-3.5 h-3.5 shrink-0" />
              <span className="text-xs sm:text-sm font-medium text-[var(--text-main)]">
                Discover Your Next Favourite Pen
              </span>
            </div>
            <span className="hidden sm:block h-px w-20 bg-gradient-to-l from-transparent to-accent/60" />
          </div>

          {/* Large Hero Headline */}
          <h1
            className="font-display font-extrabold tracking-tight text-[var(--text-main)] leading-[1.08] max-w-3xl mx-auto"
            style={{
              fontSize: 'clamp(2.25rem, 4.5vw, 4rem)',
              textWrap: 'balance',
            }}
          >
            Every Great Idea Starts With the{' '}
            <span className="text-accent drop-shadow-[0_0_24px_rgba(var(--accent-rgb),0.35)]">
              Perfect Pen.
            </span>
          </h1>

          {/* Description */}
          <p className="text-base sm:text-lg text-[var(--text-secondary)] max-w-2xl mx-auto leading-relaxed">
            Explore premium writing instruments designed for creativity, comfort, precision, and
            everyday inspiration.
          </p>

          {/* Two CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
            <button
              type="button"
              onClick={() => navigate('shop', { category: 'all' })}
              className="w-full sm:w-auto px-7 py-3.5 rounded-full text-sm sm:text-base font-semibold cta-glow-red inline-flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5"
            >
              <span>Shop Collection</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={scrollToCategories}
              className="w-full sm:w-auto px-7 py-3.5 rounded-full text-sm sm:text-base font-semibold border border-accent/65 text-[var(--text-main)] hover:bg-accent/10 hover:border-accent-bright inline-flex items-center justify-center gap-2 transition-all"
            >
              <span>Explore Categories</span>
            </button>
          </div>
        </div>
      </section>

      <div className="section-hairline max-w-6xl mx-auto" />

      {/* 2. PRODUCT CATEGORY SECTION */}
      <section id="home-categories" className="py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-8 sm:space-y-10">
          <FadeUp className="text-center max-w-2xl mx-auto space-y-3">
            <h2
              className="font-display text-2xl sm:text-4xl font-bold tracking-tight text-[var(--text-main)]"
              style={{ textWrap: 'balance' }}
            >
              Find Your <span className="text-accent">Perfect Writing</span> Companion
            </h2>
            <p className="text-sm sm:text-base text-[var(--text-secondary)]">
              Explore our carefully selected collections for every writing style and creative need.
            </p>
          </FadeUp>

          <div className="flex flex-wrap justify-center gap-4 sm:gap-5 lg:gap-6">
            {HOMEPAGE_CATEGORIES.map((cat, idx) => (
              <FadeUp
                key={cat.id}
                delay={idx * 0.06}
                className="w-full sm:w-[calc(50%-0.625rem)] lg:w-[calc(33.333%-1rem)] flex"
              >
                <button
                  type="button"
                  onClick={() => navigate('shop', { category: cat.id })}
                  className="group category-card-surface relative w-full rounded-2xl border border-accent/50 hover:border-accent-bright p-4 sm:p-5 lg:p-6 flex items-center justify-between gap-3 sm:gap-4 text-left transition-all duration-200 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    {/* Circular icon container on left */}
                    <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-full border border-accent/55 bg-accent/10 dark:bg-accent/20 flex items-center justify-center text-accent dark:text-accent-bright shrink-0 transition-transform duration-200 group-hover:scale-105 group-hover:shadow-[0_0_20px_rgba(var(--accent-rgb),0.4)]">
                      <CategoryVectorIcon category={cat.id} className="w-6 h-6 sm:w-7 sm:h-7" />
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-display text-base sm:text-lg font-bold text-[var(--text-main)] truncate">
                          {cat.title}
                        </h3>
                        {cat.id === 'other-products' && (
                          <span className="px-2 py-0.5 rounded-md bg-accent/15 border border-accent/45 text-[10px] font-bold uppercase tracking-wide text-accent dark:text-accent-bright shrink-0">
                            {otherProductsCount > 0 ? `${otherProductsCount} items` : 'Coming Soon'}
                          </span>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm text-[var(--text-secondary)] line-clamp-2">
                        {cat.description}
                      </p>
                    </div>
                  </div>

                  {/* Circular arrow button on right */}
                  <span className="w-9 h-9 rounded-full border border-[var(--border-subtle)] group-hover:border-accent-bright bg-black/5 dark:bg-black/40 flex items-center justify-center text-[var(--text-main)] group-hover:text-accent-bright shrink-0 transition-all duration-200 group-hover:translate-x-1">
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </button>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      <div className="section-hairline max-w-6xl mx-auto" />

      {/* 3. FEATURED PRODUCTS SECTION */}
      {featuredProducts.length > 0 && (
        <>
          <section className="py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto space-y-8 sm:space-y-10">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div className="space-y-2 max-w-2xl">
                  <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[var(--text-main)]">
                    Featured <span className="text-accent">Products</span>
                  </h2>
                  <p className="text-sm sm:text-base text-[var(--text-secondary)]">
                    Discover popular writing essentials selected for quality and performance.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('shop', { category: 'all' })}
                  className="self-start sm:self-auto text-sm font-semibold text-accent dark:text-accent-bright hover:underline inline-flex items-center gap-1.5 whitespace-nowrap"
                >
                  <span>Browse Full Catalogue</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
                {featuredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => navigate('shop', { category: 'all' })}
                  className="px-7 py-3 rounded-full text-sm font-semibold cta-glow-red inline-flex items-center gap-2 transition-all hover:-translate-y-0.5"
                >
                  <span>View All Products</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </section>

          <div className="section-hairline max-w-6xl mx-auto" />
        </>
      )}

      {/* 4. ABOUT AREFIN MART SECTION */}
      <section className="py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
          <FadeUp className="lg:col-span-6 flex flex-col justify-center space-y-4 sm:space-y-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-accent dark:text-accent-bright">
              Craft &amp; Purpose
            </p>
            <h2
              className="font-display text-2xl sm:text-4xl font-bold tracking-tight text-[var(--text-main)]"
              style={{ textWrap: 'balance' }}
            >
              About <span className="text-accent">Arefin Mart</span>
            </h2>
            <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
              Arefin Mart was created for people across Bangladesh who care about reliable
              pens and thoughtful everyday essentials—from university students preparing for exams
              and teachers annotating essays to artists, journal keepers, and collectors.
            </p>
            <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
              Every item in our collection is evaluated for writing precision, ink consistency,
              grip comfort, and durable construction—paired with transparent pricing in Bangladeshi
              Taka and straightforward nationwide delivery.
            </p>
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => navigate('about')}
                className="px-5 py-2.5 rounded-full border border-accent/55 text-sm font-semibold text-[var(--text-main)] hover:bg-accent/10 transition-colors inline-flex items-center gap-2"
              >
                <span>Read Our Story</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => navigate('shop', { category: 'all-pens' })}
                className="px-5 py-2.5 rounded-full text-sm font-semibold text-accent dark:text-accent-bright hover:underline"
              >
                Explore All Pens
              </button>
            </div>
          </FadeUp>

          <FadeUp delay={0.1} className="lg:col-span-6">
            <div className="h-full min-h-[220px] sm:min-h-[320px] lg:min-h-[360px] rounded-2xl overflow-hidden border border-accent/40 shadow-[0_20px_50px_-20px_rgba(var(--accent-rgb),0.28)] bg-[#0B0809]">
              <SafeImage
                src={PRODUCT_IMAGES.aboutStationeryDesk}
                alt="Arefin Mart luxury fountain pen, matte gel pen, drafting pencil, and notebook on a studio desk"
                className="w-full h-full object-cover"
              />
            </div>
          </FadeUp>
        </div>
      </section>

      {/* 5. WHY SHOP WITH US SECTION */}
      <section className="py-14 sm:py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-10">
          <FadeUp className="text-center max-w-xl mx-auto space-y-2">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[var(--text-main)]">
              Why Shop With <span className="text-accent">Arefin Mart</span>
            </h2>
            <p className="text-sm text-[var(--text-secondary)]">
              Thoughtful curation and dependable service from cart to doorstep.
            </p>
          </FadeUp>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                icon: Award,
                title: 'Quality Selection',
                desc: 'Carefully selected writing instruments for different needs.',
              },
              {
                icon: Layers,
                title: 'Wide Collection',
                desc: 'Explore a variety of pen types, styles, and colours.',
              },
              {
                icon: ShoppingBag,
                title: 'Simple Shopping',
                desc: 'Enjoy an easy and convenient online shopping experience.',
              },
              {
                icon: Headphones,
                title: 'Customer Support',
                desc: 'Get assistance whenever you need help.',
              },
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <FadeUp
                  key={item.title}
                  delay={idx * 0.06}
                  className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 space-y-3 hover:border-accent/65 transition-colors"
                >
                  <div className="w-11 h-11 rounded-xl border border-accent/45 bg-accent/10 flex items-center justify-center text-accent dark:text-accent-bright">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-display text-base font-bold text-[var(--text-main)]">
                    {item.title}
                  </h3>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                    {item.desc}
                  </p>
                </FadeUp>
              );
            })}
          </div>
        </div>
      </section>

      <div className="section-hairline max-w-6xl mx-auto" />

      {/* 6. TESTIMONIAL SECTION */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-10">
          <FadeUp className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-[var(--text-main)]">
              What Our <span className="text-accent">Customers</span> Say
            </h2>
            <p className="text-xs sm:text-sm text-[var(--text-muted)]">
              Illustrative sample customer feedback shown for store demonstration until live verified
              reviews are connected.
            </p>
          </FadeUp>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {SAMPLE_TESTIMONIALS.map((review, idx) => (
              <FadeUp
                key={review.id}
                delay={idx * 0.07}
                className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 flex flex-col justify-between gap-5"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1" aria-label={`${review.rating} out of 5 stars`}>
                      {Array.from({ length: review.rating }).map((_, idx) => (
                        <Star
                          key={idx}
                          className="w-4 h-4 text-accent-bright fill-accent-bright"
                        />
                      ))}
                    </div>
                    <Quote className="w-5 h-5 text-accent/55" />
                  </div>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                    &ldquo;{review.quote}&rdquo;
                  </p>
                </div>
                <div className="pt-3 border-t border-[var(--border-subtle)]/60">
                  <p className="text-sm font-semibold text-[var(--text-main)]">{review.name}</p>
                  <p className="text-xs text-[var(--text-muted)]">{review.role}</p>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA Strip */}
      <section className="px-4 sm:px-6 lg:px-8 pb-6">
        <FadeUp className="max-w-7xl mx-auto rounded-2xl sm:rounded-3xl border border-accent/45 bg-gradient-to-r from-[var(--surface-edge)] via-[#0c0a0b] to-[var(--surface-edge)] p-6 sm:p-8 lg:p-10 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-5 sm:gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-accent-bright">
              <Sparkles className="w-4 h-4" />
              <span>Ready to upgrade your desk?</span>
            </div>
            <h2 className="font-display text-xl sm:text-3xl font-bold">
              Explore the complete Arefin Mart collection
            </h2>
            <p className="text-sm text-[#B8B8B8]">
              Filter by pen category, other essentials, colour, or budget in BDT—with Cash on Delivery
              across Bangladesh.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('shop', { category: 'all' })}
            className="w-full md:w-auto px-6 py-3 rounded-full text-sm font-semibold cta-glow-red inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
          >
            <span>Shop Now</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </FadeUp>
      </section>
    </div>
  );
};
