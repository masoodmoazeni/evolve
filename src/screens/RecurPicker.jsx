import { Chip, Field } from '../ui.jsx';
import { RULE_TYPES, ruleSummary } from '../recurLogic.js';
import { WEEKDAYS, WEEKDAYS_SHORT, jalali } from '../util.js';

export const defaultRule = (date) => ({ type: 'none', days: [], dom: date && date !== 'someday' ? jalali(date).d : 1 });

// بخش «تکرار» در برگهٔ کار؛ rule = { type, days, dom }
export default function RecurPicker({ rule, onChange }) {
  const set = (patch) => onChange({ ...rule, ...patch });
  const toggleDay = (d) => set({ days: rule.days.includes(d) ? rule.days.filter((x) => x !== d) : [...rule.days, d] });
  return (
    <div className="col">
      <span className="lbl">تکرار</span>
      <div className="chips" role="group" aria-label="تکرار">
        {RULE_TYPES.map((t) => <Chip key={t.key} on={rule.type === t.key} onClick={() => set({ type: t.key })}>{t.label}</Chip>)}
      </div>
      {(rule.type === 'weekdays' || rule.type === 'weekly') && (
        <div className="chips" role="group" aria-label="روزهای هفته">
          {WEEKDAYS_SHORT.map((w, i) => <Chip key={w} aria-label={WEEKDAYS[i]} on={rule.days.includes(i)} onClick={() => toggleDay(i)}>{w}</Chip>)}
        </div>
      )}
      {rule.type === 'monthly' && (
        <Field label="روز ماه (شمسی)">
          <input className="in" type="number" inputMode="numeric" min="1" max="31" value={rule.dom} onChange={(e) => set({ dom: Math.max(1, Math.min(31, Number(e.target.value) || 1)) })} />
        </Field>
      )}
      {rule.type !== 'none' && <p className="xs">{ruleSummary(rule, WEEKDAYS) || 'یک روز انتخاب کن.'}{rule.type === 'monthly' && rule.dom > 29 ? ' (در ماه کوتاه‌تر، آخرین روز ماه)' : ''}</p>}
    </div>
  );
}

export const ruleError = (rule) => (['weekdays', 'weekly'].includes(rule.type) && !rule.days.length ? 'دست‌کم یک روز هفته را انتخاب کن.' : '');
