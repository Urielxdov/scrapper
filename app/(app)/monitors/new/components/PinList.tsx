'use client';

export type Pin = { label: string; css: string };

type PinListProps = {
  pins: Pin[];
  onRemove: (index: number) => void;
};

export function PinList({ pins, onRemove }: PinListProps) {
  if (pins.length === 0) {
    return (
      <p className="text-sm text-gray-400 text-center py-6 border border-dashed rounded-lg">
        Haz clic en elementos de la página para agregar campos
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {pins.map((pin, i) => (
        <li
          key={i}
          className="flex items-start justify-between bg-gray-50 rounded-lg px-3 py-2 border"
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-800">{pin.label}</p>
            <p className="text-xs text-gray-400 truncate" title={pin.css}>{pin.css}</p>
          </div>
          <button
            onClick={() => onRemove(i)}
            className="ml-2 text-gray-300 hover:text-red-500 text-lg leading-none flex-shrink-0"
            title="Eliminar campo"
          >
            ×
          </button>
        </li>
      ))}
    </ul>
  );
}
