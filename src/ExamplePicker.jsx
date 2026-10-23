import { useToast } from './ui.jsx';
import { Chip } from './ui.jsx';

// فهرست نمونه‌ها؛ هر چیپ با یک لمس همان مورد را اضافه می‌کند (حذف از صفحهٔ جزئیات)
export default function ExamplePicker({ items, onAdd, title = 'نمونه‌ها را امتحان کن' }) {
  const toast = useToast();
  return (
    <div className="col">
      <span className="lbl">{title}</span>
      <div className="chips" role="group" aria-label={title}>
        {items.map((ex) => (
          <Chip key={ex.key} onClick={async () => { await onAdd(ex); toast(`«${ex.title}» اضافه شد؛ هر وقت خواستی حذفش کن.`); }}>
            + {ex.title}
          </Chip>
        ))}
      </div>
    </div>
  );
}
