import ChartPopupView from '@/components/chart-popup/ChartPopupView';
import type { Metadata } from 'next';

interface ChartPopupPageProps {
  params: Promise<{
    address: string;
    symbol: string;
  }>;
}

function normalizeSymbol(s: string): string {
  const decoded = decodeURIComponent(s);
  if (decoded.includes(':')) {
    const [dex, coin] = decoded.split(':');
    return `${dex.toLowerCase()}:${coin.toUpperCase()}`;
  }
  return decoded.toUpperCase();
}

export async function generateMetadata({ params }: ChartPopupPageProps): Promise<Metadata> {
  const { symbol } = await params;
  const normalized = normalizeSymbol(symbol);

  return {
    title: `${normalized} Chart | RITEX AI`,
    description: `${normalized} chart popup window for multi-monitor trading setup`,
  };
}

export default async function ChartPopupPage({ params }: ChartPopupPageProps) {
  const { address, symbol } = await params;

  return <ChartPopupView coin={normalizeSymbol(symbol)} address={address} />;
}
