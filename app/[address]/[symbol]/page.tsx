import SymbolView from '@/components/symbol/SymbolView';
import type { Metadata } from 'next';

// HIP-3 coins like "xyz:SILVER" need lowercase prefix preserved
// Main perps like "btc" should be uppercased to "BTC"
function normalizeSymbol(symbol: string): string {
  const decoded = decodeURIComponent(symbol);
  if (decoded.includes(':')) {
    const [dex, coin] = decoded.split(':');
    return `${dex.toLowerCase()}:${coin.toUpperCase()}`;
  }
  return decoded.toUpperCase();
}

interface SymbolPageProps {
  params: Promise<{ address: string; symbol: string }>;
}

export async function generateMetadata({ params }: SymbolPageProps): Promise<Metadata> {
  const { symbol } = await params;
  const normalized = normalizeSymbol(symbol);

  return {
    title: `${normalized} Trading | RITEX AI`,
    description: `Real-time ${normalized} chart with advanced scalping tools across supported exchanges`,
  };
}

export default async function SymbolPage({ params }: SymbolPageProps) {
  const { address, symbol } = await params;
  const normalized = normalizeSymbol(symbol);

  return <SymbolView coin={normalized} />;
}
