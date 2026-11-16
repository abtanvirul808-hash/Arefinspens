import React, { useState } from 'react';
import {
  ArrowRight,
  Award,
  CheckCircle2,
  Clock,
  Headphones,
  Layers,
  Mail,
  MapPin,
  Phone,
  Send,
  ShoppingBag,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { PRODUCT_IMAGES } from '../data/productImages';
import { STORE_CONFIG } from '../data/storeConfig';
import { SafeImage } from '../components/SafeImage';
import { FadeUp } from '../components/FadeUp';

export const AboutPage: React.FC = () => {
  const { navigate } = useStore();

  return (
    <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-16">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
        <div className="lg:col-span-6 space-y-5 flex flex-col justify-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent dark:text-accent-bright">
            Our Story &amp; Standards
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-[var(--text-main)]">
            About <span className="text-accent">Arefin&apos;s Pen</span>
          </h1>
          <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
            Arefin&apos;s Pen is dedicated to bringing reliable, inspiring writing instruments to
            students, educators, office professionals, artists, and collectors throughout
            Bangladesh.
          </p>
          <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
            Whether you need a smear-free 0.5mm gel pen for university exams, a knurled mechanical
            pencil for architectural drafting, or a lacquered fountain pen for gifting, every item
            is chosen for dependable ink flow and lasting hand comfort.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => navigate('shop', { category: 'all' })}
              className="px-6 py-3 rounded-full text-sm font-semibold cta-glow-red inline-flex items-center gap-2"
            >
              <span>Explore Our Collection</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="lg:col-span-6">
          <div className="h-full min-h-[300px] rounded-2xl overflow-hidden border border-accent/40 bg-[#0B0809]">
            <SafeImage
              src={PRODUCT_IMAGES.aboutStationeryDesk}
              alt="Fine writing instruments and stitched journal on a dark studio desk"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>

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
              className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 space-y-3"
            >
              <div className="w-11 h-11 rounded-xl border border-accent/45 bg-accent/10 flex items-center justify-center text-accent dark:text-accent-bright">
                <Icon className="w-5 h-5" />
              </div>
              <h2 className="font-display text-base font-bold text-[var(--text-main)]">
                {item.title}
              </h2>
              <p className="text-sm text-[var(--text-secondary)]">{item.desc}</p>
            </FadeUp>
          );
        })}
      </div>
    </div>
  );
};

export const ContactPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) {
      setError('Please enter your name.');
      return;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (subject.trim().length < 3 || message.trim().length < 10) {
      setError('Please enter a subject and a message (at least 10 characters).');
      return;
    }
    setError('');
    setSubmitted(true);
    setName('');
    setEmail('');
    setSubject('');
    setMessage('');
  };

  return (
    <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-10">
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-[var(--text-main)]">
          Let&apos;s Get in <span className="text-accent">Touch</span>
        </h1>
        <p className="text-sm sm:text-base text-[var(--text-secondary)]">
          Questions about bulk school orders, fountain pen care, or corporate gifting? Send us a
          note.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 space-y-5">
          <h2 className="font-display text-lg font-bold text-[var(--text-main)]">
            Store Contact Details
          </h2>
          <p className="text-xs text-[var(--text-muted)]">
            Stored in store configuration for quick updating before launch.
          </p>

          <div className="space-y-4 text-sm">
            <div className="flex items-start gap-3">
              <Mail className="w-4 h-4 text-accent-bright mt-1 shrink-0" />
              <div>
                <p className="font-semibold text-[var(--text-main)]">Email</p>
                <p className="text-[var(--text-secondary)]">{STORE_CONFIG.contact.email}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Phone className="w-4 h-4 text-accent-bright mt-1 shrink-0" />
              <div>
                <p className="font-semibold text-[var(--text-main)]">Phone</p>
                <p className="text-[var(--text-secondary)] font-mono-num">
                  {STORE_CONFIG.contact.phone}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-accent-bright mt-1 shrink-0" />
              <div>
                <p className="font-semibold text-[var(--text-main)]">Showroom / Dispatch</p>
                <p className="text-[var(--text-secondary)]">{STORE_CONFIG.contact.address}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="w-4 h-4 text-accent-bright mt-1 shrink-0" />
              <div>
                <p className="font-semibold text-[var(--text-main)]">Support Hours</p>
                <p className="text-[var(--text-secondary)]">{STORE_CONFIG.contact.hours}</p>
              </div>
            </div>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="lg:col-span-7 rounded-2xl border border-accent/40 bg-[var(--bg-card)] p-6 space-y-4"
          noValidate
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] text-sm text-[var(--text-main)] focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Email *
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] text-sm text-[var(--text-main)] focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Subject *
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Product question, bulk inquiry, or support"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] text-sm text-[var(--text-main)] focus:outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Message *
            </label>
            <textarea
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="How can we help you?"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] text-sm text-[var(--text-main)] focus:outline-none focus:border-accent"
            />
          </div>

          {error && <p className="text-xs text-rose-500">{error}</p>}

          {submitted && (
            <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-xs text-emerald-500 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>
                Message validated (demonstration mode). Connect your email backend or form endpoint
                to receive live submissions.
              </span>
            </div>
          )}

          <button
            type="submit"
            className="px-6 py-3 rounded-xl text-sm font-semibold cta-glow-red inline-flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            <span>Send Message</span>
          </button>
        </form>
      </div>
    </div>
  );
};

export const InfoPage: React.FC = () => {
  const { infoTopic, navigate } = useStore();

  const contentMap = {
    shipping: {
      title: 'Shopping & Delivery Information',
      sections: [
        {
          heading: 'Delivery Across Bangladesh',
          body: 'Inside Dhaka Metropolitan Area: estimated 1–2 business days. Outside Dhaka: estimated 2–4 business days.',
        },
        {
          heading: 'Payment Support',
          body: 'Cash on Delivery (COD) is available across Bangladesh.',
        },
      ],
    },
    returns: {
      title: 'Return Policy',
      sections: [
        {
          heading: 'Inspection Upon Delivery',
          body: 'Customers are encouraged to inspect their stationery parcel upon delivery. Unused, sealed items damaged in transit are eligible for replacement within 7 days.',
        },
        {
          heading: 'Ink & Nib Care',
          body: 'Fountain pens inked or dipped after delivery cannot be returned unless a manufacturing nib defect is present.',
        },
      ],
    },
    privacy: {
      title: 'Privacy Policy',
      sections: [
        {
          heading: 'Local Browser Storage',
          body: 'In this demonstration storefront, your shopping cart, wishlist, display preferences, and demo order records are saved locally in browser storage.',
        },
        {
          heading: 'Customer Data Handling',
          body: 'When connected to a production backend, customer contact and delivery details are used solely to fulfill and track stationery orders.',
        },
      ],
    },
    terms: {
      title: 'Terms and Conditions',
      sections: [
        {
          heading: 'Pricing & Availability',
          body: 'All product prices are listed in Bangladeshi Taka (৳ BDT). Stock quantities and colour variants are displayed transparently per product.',
        },
        {
          heading: 'Order Confirmation',
          body: 'Orders placed through the demonstration checkout generate local reference IDs for testing the order-tracking workflow.',
        },
      ],
    },
  };

  const active = contentMap[infoTopic] || contentMap.shipping;

  return (
    <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-8">
      <div className="space-y-2">
        <p className="text-xs font-semibold text-accent dark:text-accent-bright">
          Customer Support
        </p>
        <h1 className="font-display text-3xl font-bold text-[var(--text-main)]">
          {active.title}
        </h1>
      </div>

      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 sm:p-8 space-y-6">
        {active.sections.map((sec) => (
          <div key={sec.heading} className="space-y-1.5">
            <h2 className="font-display text-base font-bold text-[var(--text-main)]">
              {sec.heading}
            </h2>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{sec.body}</p>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => navigate('shop', { category: 'all' })}
        className="px-6 py-2.5 rounded-xl text-sm font-semibold cta-glow-red"
      >
        Browse Collection
      </button>
    </div>
  );
};
