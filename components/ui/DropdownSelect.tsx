'use client';

import { DropdownMenu } from '@/components/ui/DropdownMenu';

export interface DropdownSelectOption {
  value: string;
  label: string;
}

interface DropdownSelectProps {
  label: string;
  value: string;
  options: DropdownSelectOption[];
  onChange: (value: string) => void;
  helperText?: string;
  align?: 'left' | 'right';
  minWidth?: string;
  className?: string;
  buttonClassName?: string;
}

export function DropdownSelect({
  label,
  value,
  options,
  onChange,
  helperText,
  align = 'left',
  minWidth = 'min-w-64',
  className,
  buttonClassName,
}: DropdownSelectProps) {
  const selected = options.find((option) => option.value === value) ?? options[0];

  return (
    <DropdownMenu
      title={label}
      align={align}
      minWidth={minWidth}
      className={className}
      trigger={(open) => (
        <button
          type="button"
          className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded border border-frame bg-bg-primary text-left transition-colors hover:bg-bg-secondary ${buttonClassName ?? ''}`}
        >
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-wide text-primary-muted font-mono">{label}</div>
            <div className="mt-0.5 text-xs font-mono text-primary truncate">{selected?.label ?? value}</div>
          </div>
          <span className="text-primary text-[10px] shrink-0">{open ? '▲' : '▼'}</span>
        </button>
      )}
    >
      {({ close }) => (
        <div className="bg-[#0b1320]">
          {options.map((option) => {
            const active = option.value === value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  close();
                }}
                className={`block w-full px-3 py-2.5 text-left text-sm transition-colors ${
                  active ? 'bg-white/5 text-white' : 'text-gray-300 hover:bg-gray-800/80'
                }`}
              >
                {option.label}
              </button>
            );
          })}
          {helperText && <div className="border-t border-gray-800 px-3 py-2 text-[10px] text-gray-500">{helperText}</div>}
        </div>
      )}
    </DropdownMenu>
  );
}