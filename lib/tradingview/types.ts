import type { TimeInterval } from '@/types';
import type { ExchangeType } from '@/stores/useDexStore';

export type TvResolutionString =
  | '1'
  | '3'
  | '5'
  | '15'
  | '30'
  | '60'
  | '120'
  | '240'
  | '480'
  | '720'
  | '1D'
  | '3D'
  | '1W'
  | '1M';

export type TvSupportedResolution = TvResolutionString;

export interface TvDatafeedConfiguration {
  supported_resolutions: TvSupportedResolution[];
  exchanges: Array<{ value: string; name: string; desc: string }>;
  symbols_types: Array<{ name: string; value: string }>;
}

export interface TvLibrarySymbolInfo {
  ticker: string;
  name: string;
  description: string;
  type: string;
  session: string;
  timezone: string;
  exchange: string;
  listed_exchange: string;
  minmov: number;
  pricescale: number;
  has_intraday: boolean;
  has_weekly_and_monthly: boolean;
  has_daily: boolean;
  volume_precision: number;
  supported_resolutions: TvSupportedResolution[];
  full_name: string;
}

export interface TvSearchSymbolResultItem {
  symbol: string;
  full_name: string;
  description: string;
  exchange: string;
  ticker: string;
  type: string;
}

export interface TvBar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TvHistoryMetadata {
  noData: boolean;
}

export interface TvPeriodParams {
  from: number;
  to: number;
  firstDataRequest: boolean;
}

export type TvOnReadyCallback = (configuration: TvDatafeedConfiguration) => void;
export type TvResolveCallback = (symbolInfo: TvLibrarySymbolInfo) => void;
export type TvErrorCallback = (reason: string) => void;
export type TvHistoryCallback = (bars: TvBar[], meta: TvHistoryMetadata) => void;
export type TvSubscribeBarsCallback = (bar: TvBar) => void;

export interface TradingViewDatafeed {
  onReady(callback: TvOnReadyCallback): void;
  searchSymbols(
    userInput: string,
    exchange: string,
    symbolType: string,
    onResultReadyCallback: (result: TvSearchSymbolResultItem[]) => void
  ): void;
  resolveSymbol(
    symbolName: string,
    onSymbolResolvedCallback: TvResolveCallback,
    onResolveErrorCallback: TvErrorCallback
  ): void;
  getBars(
    symbolInfo: TvLibrarySymbolInfo,
    resolution: string,
    periodParams: TvPeriodParams,
    onHistoryCallback: TvHistoryCallback,
    onErrorCallback: TvErrorCallback
  ): void;
  subscribeBars(
    symbolInfo: TvLibrarySymbolInfo,
    resolution: string,
    onRealtimeCallback: TvSubscribeBarsCallback,
    subscriberUID: string,
    onResetCacheNeededCallback: () => void
  ): void;
  unsubscribeBars(subscriberUID: string): void;
}

export interface TvExchangeDatafeedOptions {
  exchange: ExchangeType;
  dexName?: string;
}

export interface TvResolvedSymbol {
  coin: string;
  exchange: ExchangeType;
  displaySymbol: string;
  fullName: string;
  intervalDefaults: TimeInterval[];
}
