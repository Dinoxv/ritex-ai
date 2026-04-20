interface TerminalFooterProps {
  coin: string;
}

export default function TerminalFooter({ coin }: TerminalFooterProps) {
  return (
    <div className="terminal-border p-1 mt-2">
      <div className="flex flex-wrap items-center justify-center gap-2 text-[10px] text-primary-muted font-mono tracking-wider">
        <span>█ CONNECTED █ STREAMING █ {coin}/USD █ HYPERLIQUID API █</span>
        <span className="inline-flex items-center gap-1">
          <img
            src="/Ritchi-icon.png"
            alt="Ritchi logo"
            className="h-3.5 w-3.5 rounded-full"
          />
          <span>
            Bản quyền thuộc về{' '}
            <a
              href="https://ritchi.guru"
              target="_blank"
              rel="noreferrer"
              className="text-primary underline hover:text-primary-bright"
            >
              Ritchi.guru
            </a>
          </span>
        </span>
      </div>
    </div>
  );
}
