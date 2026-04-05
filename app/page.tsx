'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCredentials } from '@/lib/context/credentials-context';
import { CredentialsSettings } from '@/components/settings/CredentialsSettings';
import { LanguageDropdown } from '@/components/settings/LanguageDropdown';
import { useLanguageStore } from '@/stores/useLanguageStore';

export default function LandingPage() {
  const router = useRouter();
  const { credentials, isLoaded } = useCredentials();
  const { t } = useLanguageStore();
  const [showCredentials, setShowCredentials] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [visibleSections, setVisibleSections] = useState<Set<number>>(new Set());

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = parseInt(entry.target.getAttribute('data-section-index') || '0');
            setVisibleSections((prev) => new Set([...prev, index]));
          }
        });
      },
      { threshold: 0.1 }
    );

    const sections = document.querySelectorAll('[data-section-index]');
    sections.forEach((section) => observer.observe(section));

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (isLoaded && credentials?.walletAddress) {
      router.replace(`/${credentials.walletAddress}/trades`);
    }
  }, [router, credentials?.walletAddress, isLoaded]);

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg-primary">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-primary-muted">{t.landing.loading}</p>
        </div>
      </div>
    );
  }

  if (credentials?.walletAddress) {
    return null;
  }

  const stats = [
    { value: '15K+', label: t.landing.statsLines },
    { value: '16', label: t.landing.statsStores },
    { value: '25+', label: t.landing.statsComponents },
    { value: '25+', label: t.landing.statsIndicators },
    { value: '8', label: t.landing.statsScanners },
    { value: '20+', label: t.landing.statsThemes },
  ];

  const archLayers = [
    { name: t.landing.archLayerUI, desc: t.landing.archLayerUIDesc, color: 'from-blue-500/20 to-blue-500/5', border: 'border-blue-500/30' },
    { name: t.landing.archLayerState, desc: t.landing.archLayerStateDesc, color: 'from-purple-500/20 to-purple-500/5', border: 'border-purple-500/30' },
    { name: t.landing.archLayerService, desc: t.landing.archLayerServiceDesc, color: 'from-amber-500/20 to-amber-500/5', border: 'border-amber-500/30' },
    { name: t.landing.archLayerTransport, desc: t.landing.archLayerTransportDesc, color: 'from-emerald-500/20 to-emerald-500/5', border: 'border-emerald-500/30' },
  ];

  const perfItems = [
    { title: t.landing.perfRAF, desc: t.landing.perfRAFDesc },
    { title: t.landing.perfMemo, desc: t.landing.perfMemoDesc },
    { title: t.landing.perfVirtual, desc: t.landing.perfVirtualDesc },
    { title: t.landing.perfDebounce, desc: t.landing.perfDebounceDesc },
    { title: t.landing.perfCache, desc: t.landing.perfCacheDesc },
    { title: t.landing.perfLazyWS, desc: t.landing.perfLazyWSDesc },
  ];

  const features = [
    { img: '/landing/symboloverview.png', title: t.landing.symbolOverview, desc: t.landing.symbolOverviewDesc },
    { img: '/landing/preciseordering.gif', title: t.landing.preciseOrdering, desc: t.landing.preciseOrderingDesc },
    { img: '/landing/keyboardshortcuts.png', title: t.landing.keyboardShortcuts, desc: t.landing.keyboardShortcutsDesc },
    { img: '/landing/scanner.png', title: t.landing.marketScanner, desc: t.landing.marketScannerDesc },
    { img: '/landing/multitimeframe.png', title: t.landing.multiTimeframe, desc: t.landing.multiTimeframeDesc },
    { img: '/landing/dailyoverview.png', title: t.landing.performanceTracking, desc: t.landing.performanceTrackingDesc },
    { img: '/landing/multimonitor.png', title: t.landing.multiMonitor, desc: t.landing.multiMonitorDesc },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent pointer-events-none"></div>

      {/* Language Switcher */}
      <div className="fixed top-4 right-4 md:top-6 md:right-6 z-50">
        <LanguageDropdown />
      </div>

      <div className="relative">
        {/* ── HERO ── */}
        <header className="min-h-screen relative overflow-hidden flex items-center justify-center">
          <div className="absolute inset-0 z-0" style={{ transform: `translateY(${scrollY * 0.5}px)`, transition: 'transform 0.1s ease-out' }}>
            <div className="absolute inset-0 bg-gradient-to-br from-slate-950/70 via-slate-900/80 to-slate-950/70 z-10"></div>
            <img src="/landing/hero.png" alt="RITEX AI Trading Platform" className="w-full h-full object-cover" />
          </div>
          <div className="absolute -top-20 -right-20 w-64 h-64 md:w-96 md:h-96 bg-primary/20 rounded-full blur-3xl z-0" style={{ transform: `translateY(${scrollY * 0.3}px)` }}></div>
          <div className="absolute -bottom-20 -left-20 w-64 h-64 md:w-96 md:h-96 bg-primary/10 rounded-full blur-3xl z-0" style={{ transform: `translateY(${scrollY * 0.7}px)` }}></div>

          <div className="relative z-20 max-w-5xl mx-auto px-4 md:px-6 text-center">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-4 mb-6">
              <h1 className="text-4xl sm:text-5xl md:text-8xl font-bold tracking-tight bg-gradient-to-r from-white via-primary to-white bg-clip-text text-transparent animate-gradient bg-[length:200%_auto]">
                RITEX AI
              </h1>
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-yellow-500/20 border border-yellow-500/50 rounded-lg text-yellow-500 font-mono text-xs md:text-sm font-bold">BETA</span>
                <a href="https://github.com/Dinoxv/ritex-ai" target="_blank" rel="noopener noreferrer" className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-primary/50 rounded-lg transition-all hover:scale-110" title="GitHub">
                  <svg className="w-5 h-5 md:w-6 md:h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                </a>
              </div>
            </div>
            <p className="text-lg sm:text-xl md:text-3xl text-white mb-3 font-mono font-light">
              {t.landing.subtitle} <span className="text-primary font-bold">Hyperliquid</span>
            </p>
            <p className="text-base sm:text-lg md:text-2xl text-primary/80 mb-6 font-mono font-light">{t.landing.tagline}</p>
            <p className="text-sm sm:text-base md:text-xl text-gray-300 mb-10 max-w-3xl mx-auto leading-relaxed px-4">{t.landing.description}</p>
            <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center px-4">
              <a href="/0xb83de012dba672c76a7dbbbf3e459cb59d7d6e36/btc/" className="group relative px-8 py-4 bg-gradient-to-r from-gray-700 to-gray-600 hover:from-gray-600 hover:to-gray-500 font-mono uppercase tracking-wider transition-all text-sm rounded-xl shadow-lg hover:shadow-xl hover:scale-105">
                <span className="relative z-10">{t.landing.viewDemo}</span>
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </a>
              <button onClick={() => setShowCredentials(true)} className="group relative px-8 py-4 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary font-mono uppercase tracking-wider transition-all text-sm rounded-xl shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-105">
                <span className="relative z-10">{t.landing.launchTerminal}</span>
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </button>
            </div>
          </div>
        </header>

        {/* Credentials Modal */}
        {showCredentials && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 md:p-6">
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-4 md:p-8 max-w-2xl w-full relative shadow-2xl max-h-[90vh] overflow-y-auto">
              <button onClick={() => setShowCredentials(false)} className="absolute top-3 right-3 md:top-4 md:right-4 text-gray-400 hover:text-primary font-mono text-xl transition-colors">✕</button>
              <div className="mb-6">
                <h2 className="text-xl md:text-2xl font-bold font-mono text-primary mb-2">{t.landing.letsGo}</h2>
                <p className="text-gray-400 text-xs md:text-sm">{t.landing.connectWallet}</p>
              </div>
              <CredentialsSettings />
            </div>
          </div>
        )}

        <div className="max-w-6xl mx-auto px-4 md:px-6 py-12 md:py-20 space-y-16 md:space-y-28">

          {/* ── 01 · STATS PILLS ── */}
          <section data-section-index="0">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
              {stats.map((s, i) => (
                <div key={i} className="backdrop-blur-lg bg-white/5 border border-white/10 rounded-xl p-4 text-center hover:bg-white/10 hover:border-primary/30 transition-all">
                  <div className="text-2xl md:text-3xl font-bold font-mono text-primary">{s.value}</div>
                  <div className="text-xs md:text-sm text-gray-400 mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          </section>

          {/* ── 02 · CLIENT SIDE + CORE ── */}
          <section data-section-index="1">
            <div className="backdrop-blur-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/30 rounded-2xl p-6 md:p-8 lg:p-12 shadow-xl mb-8">
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-3 md:mb-4 font-mono text-primary">{t.landing.clientSide}</h2>
              <p className="text-gray-200 text-base md:text-lg leading-relaxed">{t.landing.clientSideDesc}</p>
            </div>
            <div className="grid md:grid-cols-2 gap-4 md:gap-6">
              {[
                { title: t.landing.analysis, desc: t.landing.analysisDesc },
                { title: t.landing.execution, desc: t.landing.executionDesc },
                { title: t.landing.scanner, desc: t.landing.scannerDesc },
                { title: t.landing.tracking, desc: t.landing.trackingDesc },
              ].map((item, i) => (
                <div key={i} className="backdrop-blur-lg bg-white/5 border border-white/10 rounded-xl p-5 md:p-6 hover:bg-white/10 transition-all md:hover:scale-105">
                  <h3 className="text-lg md:text-xl font-mono text-primary mb-2 md:mb-3">{item.title}</h3>
                  <p className="text-gray-300 text-sm md:text-base leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ── 03 · ARCHITECTURE ── */}
          <section data-section-index="2">
            <div className="text-center mb-8 md:mb-12">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold font-mono bg-gradient-to-r from-white to-primary bg-clip-text text-transparent">{t.landing.architectureTitle}</h2>
              <p className="text-gray-400 text-sm md:text-base mt-3 max-w-2xl mx-auto">{t.landing.architectureDesc}</p>
            </div>
            <div className="space-y-3 md:space-y-4">
              {archLayers.map((layer, i) => (
                <div key={i} className={`backdrop-blur-lg bg-gradient-to-r ${layer.color} border ${layer.border} rounded-xl p-5 md:p-6 hover:scale-[1.01] transition-transform`}>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                    <span className="text-white font-mono font-bold text-base md:text-lg shrink-0">{layer.name}</span>
                    <span className="hidden sm:block text-white/20">→</span>
                    <span className="text-gray-300 text-sm md:text-base font-mono">{layer.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── 04 · TECHNICAL INDICATORS ── */}
          <section data-section-index="3">
            <div className="text-center mb-8 md:mb-12">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold font-mono bg-gradient-to-r from-white to-primary bg-clip-text text-transparent">{t.landing.techIndicatorsTitle}</h2>
              <p className="text-gray-400 text-sm md:text-base mt-3 max-w-2xl mx-auto">{t.landing.techIndicatorsDesc}</p>
            </div>
            <div className="grid md:grid-cols-3 gap-4 md:gap-6 mb-4 md:mb-6">
              {[
                { title: t.landing.trendIndicators, list: t.landing.trendIndicatorsList },
                { title: t.landing.momentumIndicators, list: t.landing.momentumIndicatorsList },
                { title: t.landing.patternDetection, list: t.landing.patternDetectionList },
              ].map((item, i) => (
                <div key={i} className="backdrop-blur-lg bg-white/5 border border-white/10 rounded-xl p-5 md:p-6 hover:bg-white/10 transition-all">
                  <h3 className="text-primary font-mono font-bold text-base md:text-lg mb-3">{item.title}</h3>
                  <div className="space-y-1.5">
                    {item.list.split(' | ').map((indicator, j) => (
                      <div key={j} className="flex items-center gap-2 text-sm text-gray-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0"></span>
                        {indicator}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {/* Divergence highlight */}
            <div className="backdrop-blur-xl bg-gradient-to-r from-yellow-500/10 to-amber-500/5 border border-yellow-500/30 rounded-xl p-5 md:p-6">
              <h3 className="text-yellow-400 font-mono font-bold text-base md:text-lg mb-2">⚡ {t.landing.divergenceTitle}</h3>
              <p className="text-gray-300 text-sm md:text-base">{t.landing.divergenceDesc}</p>
            </div>
          </section>

          {/* ── 05 · TRADING FLOW ── */}
          <section data-section-index="4">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold font-mono text-center mb-8 md:mb-12 bg-gradient-to-r from-white to-primary bg-clip-text text-transparent">{t.landing.tradingFlowTitle}</h2>
            <div className="grid sm:grid-cols-2 gap-4 md:gap-6">
              {[
                { title: t.landing.cloudOrdersTitle, desc: t.landing.cloudOrdersDesc, icon: '☁️' },
                { title: t.landing.marketOrdersTitle, desc: t.landing.marketOrdersDesc, icon: '⚡' },
                { title: t.landing.tpslTitle, desc: t.landing.tpslDesc, icon: '🛡️' },
                { title: t.landing.optimisticUITitle, desc: t.landing.optimisticUIDesc, icon: '🚀' },
              ].map((item, i) => (
                <div key={i} className="backdrop-blur-lg bg-white/5 border border-white/10 rounded-xl p-5 md:p-6 hover:bg-white/10 hover:border-primary/30 transition-all">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl">{item.icon}</span>
                    <h3 className="text-primary font-mono font-bold text-base md:text-lg">{item.title}</h3>
                  </div>
                  <p className="text-gray-300 text-sm md:text-base leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ── 06 · PERFORMANCE ── */}
          <section data-section-index="5">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold font-mono text-center mb-8 md:mb-12 bg-gradient-to-r from-white to-primary bg-clip-text text-transparent">{t.landing.performanceTitle}</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {perfItems.map((item, i) => (
                <div key={i} className="backdrop-blur-lg bg-white/5 border border-white/10 rounded-xl p-5 md:p-6 hover:bg-white/10 transition-all group">
                  <div className="text-sm font-mono text-primary/50 group-hover:text-primary transition-colors mb-1">0{i + 1}</div>
                  <h3 className="text-white font-mono font-bold text-base md:text-lg mb-2">{item.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* ── 07 · FEATURES CAROUSEL ── */}
        <section className="mb-16 md:mb-28 w-full">
          <div className="max-w-6xl mx-auto px-4 md:px-6 mb-8 md:mb-12">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold font-mono text-center bg-gradient-to-r from-white to-primary bg-clip-text text-transparent">{t.landing.featuresThatMatter}</h2>
            <p className="text-center text-gray-400 text-sm mt-2 md:hidden">{t.landing.swipeToExplore}</p>
          </div>
          <div className="relative overflow-x-auto overflow-y-hidden w-full px-4 md:px-0 md:overflow-hidden scrollbar-hide snap-x snap-mandatory">
            <div className="flex gap-4 md:gap-6 md:animate-scroll-left pb-4">
              {[...features, ...features].map((f, i) => (
                <div key={i} className={`backdrop-blur-lg bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:border-primary/30 transition-all overflow-hidden flex-none snap-start ${i >= features.length ? 'w-80 hidden md:block' : 'w-[85vw] md:w-80'}`}>
                  <div className="group aspect-video overflow-hidden bg-black/20">
                    <img src={f.img} alt={f.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  </div>
                  <div className="p-5 md:p-6">
                    <h3 className="text-base md:text-lg font-mono text-primary mb-2">{f.title}</h3>
                    <p className="text-sm text-gray-300 leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="max-w-6xl mx-auto px-4 md:px-6">

          {/* ── 08 · TECH STACK ── */}
          <section className="mb-16 md:mb-28" data-section-index="6">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold font-mono text-center mb-8 md:mb-12 bg-gradient-to-r from-white to-primary bg-clip-text text-transparent">{t.landing.techStackTitle}</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              {[
                { name: 'Next.js 16', desc: 'Turbopack' },
                { name: 'React 19', desc: 'Server Components' },
                { name: 'TypeScript 5', desc: 'Strict Mode' },
                { name: 'TailwindCSS 4', desc: 'Utility-first' },
                { name: 'Zustand 5', desc: '16+ Stores' },
                { name: 'TradingView', desc: 'Lightweight Charts' },
                { name: '@nktkas/hyperliquid', desc: 'SDK' },
                { name: 'WebSocket', desc: 'Real-time Data' },
              ].map((tech, i) => (
                <div key={i} className="backdrop-blur-lg bg-white/5 border border-white/10 rounded-xl p-4 text-center hover:bg-white/10 hover:border-primary/30 transition-all">
                  <div className="text-white font-mono font-bold text-sm md:text-base">{tech.name}</div>
                  <div className="text-gray-500 text-xs mt-1">{tech.desc}</div>
                </div>
              ))}
            </div>
          </section>

          {/* ── 09 · HOW IT WORKS ── */}
          <section className="mb-16 md:mb-28" data-section-index="7">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-8 md:mb-12 font-mono text-center bg-gradient-to-r from-white to-primary bg-clip-text text-transparent">{t.landing.howItWorks}</h2>
            <div className="grid md:grid-cols-2 gap-4 md:gap-6">
              {[
                { step: '01', title: t.landing.connect, desc: t.landing.connectDesc },
                { step: '02', title: t.landing.scan, desc: t.landing.scanDesc },
                { step: '03', title: t.landing.sendIt, desc: t.landing.sendItDesc },
                { step: '04', title: t.landing.review, desc: t.landing.reviewDesc },
              ].map((item, i) => (
                <div key={i} className="backdrop-blur-lg bg-white/5 border border-white/10 rounded-xl p-5 md:p-8 hover:bg-white/10 transition-all group">
                  <div className="flex items-start gap-3 md:gap-4">
                    <div className="text-3xl md:text-4xl font-bold font-mono text-primary/30 group-hover:text-primary transition-colors">{item.step}</div>
                    <div className="flex-1">
                      <p className="text-primary font-mono text-base md:text-lg mb-2">{item.title}</p>
                      <p className="text-gray-300 text-sm md:text-base">{item.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── FOOTER CTA ── */}
          <footer className="text-center pb-16 md:pb-32">
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 md:p-12 inline-block w-full md:w-auto">
              <h3 className="text-2xl md:text-3xl font-bold mb-3 md:mb-4 font-mono">{t.landing.readyToTrade}</h3>
              <p className="text-gray-300 text-sm md:text-base mb-6 md:mb-8 max-w-md mx-auto">{t.landing.readyToTradeDesc}</p>
              <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center">
                <a href="/0xb83de012dba672c76a7dbbbf3e459cb59d7d6e36/btc/" className="group relative px-8 py-4 bg-gradient-to-r from-gray-700 to-gray-600 hover:from-gray-600 hover:to-gray-500 font-mono uppercase tracking-wider transition-all text-sm rounded-xl shadow-lg hover:shadow-xl hover:scale-105">
                  <span className="relative z-10">{t.landing.viewDemo}</span>
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </a>
                <button onClick={() => setShowCredentials(true)} className="group relative px-8 py-4 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary font-mono uppercase tracking-wider transition-all text-sm rounded-xl shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-105">
                  <span className="relative z-10">{t.landing.launchTerminal}</span>
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </button>
              </div>
              <div className="mt-8 pt-6 border-t border-white/10">
                <a href="https://github.com/Dinoxv/ritex-ai" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-gray-400 hover:text-primary transition-colors font-mono text-xs md:text-sm">
                  <svg className="w-4 h-4 md:w-5 md:h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                  <span>{t.landing.openSourceOnGithub}</span>
                </a>
                <span className="mx-2 text-white/20">·</span>
                <a href="https://ritexai.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-gray-400 hover:text-primary transition-colors font-mono text-xs md:text-sm">
                  <span>RITEX AI</span>
                </a>
              </div>
            </div>
          </footer>
        </div>
      </div>

      {/* Beta warning bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 backdrop-blur-xl bg-yellow-900/30 border-t-2 border-yellow-500/50">
        <div className="max-w-7xl mx-auto px-3 md:px-4 py-2 md:py-3">
          <div className="flex items-center justify-center gap-2 md:gap-3 text-center">
            <svg className="w-4 h-4 md:w-5 md:h-5 text-yellow-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <p className="text-[10px] sm:text-xs md:text-sm text-yellow-200">
              <strong className="font-bold text-yellow-500">{t.landing.beta}:</strong> {t.landing.betaWarning}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
