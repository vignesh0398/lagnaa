import {
  DEFAULT_MEMBER_FEATURES,
  featureGroups,
  type MemberFeature,
} from '../../utils/memberFeatures';

export function FeaturePicker({
  value,
  onChange,
  disabled = false,
}: {
  value: MemberFeature[];
  onChange: (next: MemberFeature[]) => void;
  disabled?: boolean;
}) {
  const groups = featureGroups();

  const toggle = (id: MemberFeature) => {
    if (disabled) return;
    onChange(value.includes(id) ? value.filter((f) => f !== id) : [...value, id]);
  };

  const selectDefaults = () => onChange([...DEFAULT_MEMBER_FEATURES]);
  const selectAll = () => onChange(groups.flatMap((g) => g.options.map((o) => o.id)));
  const clearAll = () => onChange([]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-white">Enabled features</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={selectDefaults} disabled={disabled} className="btn-secondary px-2 py-1 text-[10px]">
            Default set
          </button>
          <button type="button" onClick={selectAll} disabled={disabled} className="btn-secondary px-2 py-1 text-[10px]">
            Select all
          </button>
          <button type="button" onClick={clearAll} disabled={disabled} className="btn-secondary px-2 py-1 text-[10px]">
            Clear
          </button>
        </div>
      </div>

      {groups.map(({ group, options }) => (
        <div key={group}>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">{group}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {options.map((opt) => {
              const checked = value.includes(opt.id);
              return (
                <label
                  key={opt.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
                    checked
                      ? 'border-[var(--theme-accent)]/40 bg-[var(--theme-accent)]/10'
                      : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                  } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={disabled}
                    onChange={() => toggle(opt.id)}
                    className="mt-0.5 rounded border-white/20"
                  />
                  <span>
                    <span className="block text-sm font-medium text-white">{opt.label}</span>
                    <span className="block text-xs text-slate-500">{opt.description}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      ))}

      <p className="text-xs text-slate-500">
        {value.length} feature{value.length === 1 ? '' : 's'} enabled · Home is always available
      </p>
    </div>
  );
}