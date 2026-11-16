export const STORE_CONFIG = {
  brandName: "Arefin's Pen",
  tagline: 'Writing instruments crafted for clarity, precision, and inspiration.',
  currencySymbol: '৳',
  currencyCode: 'BDT',
  // Editable business contact configuration (replace with live store details before launch)
  contact: {
    email: 'support@arefinspen.example',
    phone: '+880 1700-000000 (Sample)',
    address: 'House 24, Road 7, Dhanmondi, Dhaka 1205, Bangladesh (Configurable Address)',
    hours: 'Saturday – Thursday, 10:00 AM – 8:00 PM BST',
  },
  socialLinks: {
    facebook: '#contact',
    instagram: '#contact',
    youtube: '#contact',
  },
  paymentConfig: {
    cashOnDeliveryEnabled: true,
  },
};

export const DEMO_TRACKING_ORDERS = [
  {
    orderId: '#1',
    phone: '01711000000',
    customerName: 'Mahmudul Hasan (Demo)',
    city: 'Dhaka',
    address: 'Banani Block E, Dhaka 1213',
    paymentMethod: 'cod' as const,
    totalBdt: 1490,
    itemsSummary: 'Arefin Noir 0.5mm Gel Pen × 2, Obsidian Sovereign Fountain Pen × 1',
    placedAt: '2026-11-13 · 2:15 PM',
    currentStageIndex: 3, // Shipped
    isDemoRecord: true,
  },
  {
    orderId: '#2',
    phone: '01812000000',
    customerName: 'Nusrat Jahan (Demo)',
    city: 'Chattogram',
    address: 'Nasirabad Housing Society, Chattogram',
    paymentMethod: 'cod' as const,
    totalBdt: 840,
    itemsSummary: 'Prism Dual-Tip Creative Markers (6-Pack) × 1',
    placedAt: '2026-11-10 · 11:40 AM',
    currentStageIndex: 4, // Delivered
    isDemoRecord: true,
  },
];

export const SAMPLE_TESTIMONIALS = [
  {
    id: 'rev-1',
    name: 'Tariqul Islam',
    role: 'Architecture Student · BUET, Dhaka',
    rating: 5,
    quote:
      'The 0.5mm drafting pencil and fine-point gel pens have completely replaced my everyday studio tools. Crisp weight balance and clean ink flow.',
  },
  {
    id: 'rev-2',
    name: 'Farhana Rahman',
    role: 'Lecturer & Journal Keeper · Chattogram',
    rating: 5,
    quote:
      'Ordered the Crimson Lacquer Fountain Pen as a gift and picked up a set of highlighters for grading papers. Thoughtful packaging and swift delivery.',
  },
  {
    id: 'rev-3',
    name: 'Sajjad Hossain',
    role: 'Senior Product Manager · Sylhet',
    rating: 5,
    quote:
      'Choosing ink colours directly on the product page made ordering for our whole team effortless. Every pen arrived ready to write cleanly.',
  },
];
