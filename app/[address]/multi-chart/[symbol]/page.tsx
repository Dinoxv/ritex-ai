import MultiChartView from '@/components/multi-chart/MultiChartView';
import type { Metadata } from 'next';

interface MultiChartPageProps {
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

export async function generateMetadata({ params }: MultiChartPageProps): Promise<Metadata> {
  const { symbol } = await params;
  const normalized = normalizeSymbol(symbol);

  return {
    title: `${normalized} Multi-Chart | RITEX AI`,
    description: `${normalized} multi-timeframe analysis with synchronized charts`,
  };
}

export default async function MultiChartPage({ params }: MultiChartPageProps) {
  const { address, symbol } = await params;

  return <MultiChartView coin={normalizeSymbol(symbol)} />;
}
