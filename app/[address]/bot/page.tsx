import type { Metadata } from 'next';
import BotTradingView from '@/components/BotTradingView';

export const metadata: Metadata = {
  title: 'Bot Trading | RITEX AI',
  description: 'Manage automated trading bot settings and execution',
};

export default function BotTradingPage() {
  return <BotTradingView />;
}
