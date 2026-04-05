import TodaysTradesView from '@/components/TodaysTradesView';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Trade History | RITEX AI",
  description: "View your complete trading history with performance analytics and detailed trade metrics",
};

export default function TradesPage() {
  return <TodaysTradesView />;
}
