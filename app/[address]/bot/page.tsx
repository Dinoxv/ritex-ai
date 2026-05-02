import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import BotTradingView from '@/components/BotTradingView';
import { isBinanceRouteSlug, BINANCE_ROUTE_SLUG } from '@/lib/constants/routing';

export const metadata: Metadata = {
  title: 'Bot Trading | RITEX AI',
  description: 'Manage automated trading bot settings and execution',
};

export default async function BotTradingPage({ params }: { params: Promise<{ address: string }> }) {
  const { address } = await params;
  if (!isBinanceRouteSlug(address)) {
    redirect(`/${BINANCE_ROUTE_SLUG}/bot`);
  }
  return <BotTradingView />;
}
