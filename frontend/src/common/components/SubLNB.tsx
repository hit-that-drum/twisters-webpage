interface SubLnbItem {
  key: string;
  label: string;
  meta?: string;
}

interface SubLnbProps {
  title: string;
  items: SubLnbItem[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
  onNavigate?: () => void;
  emptyMessage?: string;
}

export default function SubLNB({
  title,
  items,
  selectedKey,
  onSelect,
  onNavigate,
  emptyMessage = 'No items found.',
}: SubLnbProps) {
  return (
    <aside className="sticky top-6 self-start rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">{title}</p>

      <nav aria-label="Sub navigation" className="space-y-1">
        {items.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-200 px-3 py-4 text-sm text-gray-500">
            {emptyMessage}
          </p>
        ) : (
          items.map((item) => {
            const isActive = item.key === selectedKey;

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  onSelect(item.key);
                  onNavigate?.();
                }}
                className={`flex w-full flex-col items-start rounded-lg px-3 py-2 text-left transition ${
                  isActive
                    ? 'bg-blue-700 text-white shadow-sm'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <span className="text-sm font-semibold">{item.label}</span>
                {item.meta ? (
                  <span className={`text-xs ${isActive ? 'text-blue-100' : 'text-gray-500'}`}>
                    {item.meta}
                  </span>
                ) : null}
              </button>
            );
          })
        )}
      </nav>
    </aside>
  );
}
