import { deriveReviewStatus } from './review-rules.mjs';

export interface Source {
  id: string;
  title: string;
  text: string;
}

export interface Offer {
  id: string;
  merchant: string;
  title: string;
  subtitle: string;
  domain: string;
  kind: 'coffee' | 'trial' | 'unknown';
  status: 'warning' | 'high' | 'clear' | 'unknown';
  alert: string;
  benefit: string;
  cost: string;
  costLabel: string;
  deadline: string;
  deadlineLabel: string;
  eligibility: string;
  steps: string[];
  exclusions: string;
  sources: Source[];
}

// Original synthetic offers for interface testing; none describe a live promotion.
export const offers: Offer[] = [
  {
    id: 'coffee',
    merchant: 'Cedar Coffee',
    title: 'Free coffee. No purchase needed.',
    subtitle: 'A small treat, with a condition worth checking.',
    domain: 'cedar-coffee.example',
    kind: 'coffee',
    status: deriveReviewStatus(1, false),
    alert: 'The headline says no purchase is needed, but the terms require a ₱199 minimum spend.',
    benefit: 'One basic hot coffee',
    cost: '₱199',
    costLabel: 'Minimum spend required',
    deadline: '31 Oct 2026',
    deadlineLabel: 'Redemption deadline · 11:59 PM Philippine time',
    eligibility: 'New customers at the demo Makati branch only.',
    steps: ['Register with your name and email before claiming.', 'Visit the demo Makati branch.', 'Spend at least ₱199 on eligible items.', 'Ask for the complimentary basic hot coffee.'],
    exclusions: 'Add-ons cost extra. Other branches and existing customers are excluded.',
    sources: [
      { id: 'coffee-headline', title: 'Synthetic landing-page headline', text: 'Free coffee. No purchase needed.' },
      { id: 'coffee-terms', title: 'Synthetic promotion terms', text: 'New customers at the demo Makati branch receive one basic hot coffee with a minimum spend of ₱199. Register with your name and email before claiming. Redeem by 31 October 2026 at 11:59 PM Philippine time. Add-ons cost extra. Other branches and existing customers are excluded.' },
    ],
  },
  {
    id: 'trial',
    merchant: 'Pocket Notes',
    title: 'Try Pocket Notes free for 7 days.',
    subtitle: 'The recurring price is disclosed alongside the trial.',
    domain: 'pocket-notes.example',
    kind: 'trial',
    status: deriveReviewStatus(0, false),
    alert: 'The trial and recurring price match the supplied demo terms. This does not verify the merchant’s legitimacy.',
    benefit: '7-day trial',
    cost: '₱149 / month',
    costLabel: 'Starts after the 7-day trial',
    deadline: 'Before your trial ends',
    deadlineLabel: 'Cancellation deadline · relative to signup',
    eligibility: 'New accounts only.',
    steps: ['Create a new account.', 'Start the 7-day trial.', 'Cancel before the trial ends to avoid the recurring charge.'],
    exclusions: 'Existing accounts are excluded. The monthly subscription continues unless cancelled.',
    sources: [
      { id: 'trial-headline', title: 'Synthetic landing-page headline', text: 'Try Pocket Notes free for 7 days. Then ₱149 per month. Cancel before your trial ends to avoid being charged.' },
      { id: 'trial-terms', title: 'Synthetic trial terms', text: 'New accounts receive a 7-day trial beginning at signup. A ₱149 monthly subscription starts after the 7-day trial and continues unless cancelled. Cancel before the trial ends to avoid being charged. Existing accounts are excluded.' },
    ],
  },
  {
    id: 'unknown',
    merchant: 'Mystery Perks',
    title: 'Unlock a welcome reward.',
    subtitle: 'The terms could not be accessed in this demo.',
    domain: 'mystery-perks.example',
    kind: 'unknown',
    status: deriveReviewStatus(0, true),
    alert: 'Insufficient data to verify. The promotion terms are unavailable.',
    benefit: 'Insufficient data to verify',
    cost: 'Unknown',
    costLabel: 'Insufficient data to verify',
    deadline: 'Unknown',
    deadlineLabel: 'Insufficient data to verify',
    eligibility: 'Insufficient data to verify',
    steps: ['Insufficient data to verify the required steps.'],
    exclusions: 'Insufficient data to verify',
    sources: [
      { id: 'unknown-headline', title: 'Synthetic landing-page headline', text: 'Unlock a welcome reward.' },
    ],
  },
];
