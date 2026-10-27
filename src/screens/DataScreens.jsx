import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { exportAll } from '../db.js';
import { Page, Top, Card, Chip, Skeleton, Bars } from '../ui.jsx';
import { MOODS } from '../logic.js';
import { faNum, fmtDateFull } from '../util.js';
import { saveFile, stamp } from '../exportLogic.js';
import { TABLE_LABELS, applyImport, parseBackup, previewImport } from '../importLogic.js';
import { BackToApp } from './PrivacyNotes.jsx';
import { buildReport, dailyCSV, habitsCSV, obstaclesCSV, skillsCSV } from '../reportLogic.js';

const label = (n) => TABLE_LABELS[n] ?? n;
const pctText = (v) => (v == null ? 'داده کافی نیست' : `${faNum(Math.round(v * 100))}٪`);

export function PrivacyImport() {
  const input = useRef();
  const [backup, setBackup] = useState(null);
  const [mode, setMode] = useState('merge');
  const [skipOld, setSkipOld] = useState(true);
  const [prev, setPrev] = useState(null);
  const [msg, setMsg] = useState('');
  const [done, setDone] = useState(null);

  const refresh = async (b, m, s) => setPrev(await previewImport(b, { mode: m, skipOld: s }));

  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setMsg('');
    setDone(null);
    const r = parseBackup(await file.text());
    if (!r.ok) {
      setBackup(null);
      setPrev(null);
      setMsg(r.error);
      return;
    }
    setBackup(r.backup);
    await refresh(r.backup, mode, skipOld);
  };

  const change = (m, s) => {
    setMode(m);
    setSkipOld(s);
    if (backup) refresh(backup, m, s);
  };

  const apply = async () => {
    try {
      setDone(await applyImport(backup, { mode, skipOld }));
      setBackup(null);
      setPrev(null);
    } catch {
      setMsg('نتوانستیم وارد کنیم؛ دوباره امتحان کن. داده‌های فعلی‌ات دست‌نخورده است.');
    }
  };

  const total = prev?.reduce((a, p) => a + p.willAdd, 0) ?? 0;
  const old = prev?.reduce((a, p) => a + p.old, 0) ?? 0;

  return (
    <Page tabs={false}>
      <Top title="وارد کردن پشتیبان" back="/privacy" />
      <p className="s">فایل JSON که پیش‌تر از اِوالو خروجی گرفته‌ای را انتخاب کن تا داده‌هایت برگردد. پیش از اعمال، پیش‌نمایش می‌بینی.</p>
      <input ref={input} type="file" accept="application/json,.json" hidden onChange={pick} />
      <button className="btn s2" onClick={() => input.current.click()}>انتخاب فایل پشتیبان</button>
      {msg && <p className="err" role="alert">{msg}</p>}
      {done && (
        <Card kind="mint" role="status">
          <h3>داده‌ها برگشت</h3>
          <p className="s">{faNum(done.reduce((a, d) => a + d.added, 0))} رکورد وارد شد.</p>
          <Link className="btn sm" to="/today">برو به امروز</Link>
        </Card>
      )}
      {prev && (
        <>
          <Card>
            <span className="lbl">روش ورود</span>
            <div className="chips">
              <Chip on={mode === 'merge'} onClick={() => change('merge', skipOld)}>ادغام</Chip>
              <Chip on={mode === 'replace'} onClick={() => change('replace', skipOld)}>جایگزینی</Chip>
            </div>
            <p className="xs">
              {mode === 'merge'
                ? 'ادغام: داده‌های فعلی می‌مانند و فقط رکوردهای تازه اضافه می‌شوند (رکورد هم‌شناسه حفظ می‌شود).'
                : 'جایگزینی: جدول‌های موجود در فایل پیش از ورود خالی می‌شوند. مناسب وقتی اپ را از نو نصب کرده‌ای.'}
            </p>
            <Chip on={skipOld} onClick={() => change(mode, !skipOld)}>رکوردهای قدیمی‌تر از مدت نگه‌داری وارد نشوند</Chip>
            {!skipOld && old > 0 && <p className="xs">{faNum(old)} رکورد قدیمی در پاک‌سازی بعدی دوباره حذف می‌شود؛ پیش از آن از «گزارش» خروجی بگیر.</p>}
          </Card>
          <Card>
            <span className="lbl">پیش‌نمایش</span>
            {prev.map((p) => (
              <div className="row" key={p.name}>
                <span className="grow">{label(p.name)}</span>
                <span className="xs">
                  {p.unknown ? 'ناشناخته؛ نادیده گرفته می‌شود' : `${faNum(p.willAdd)} از ${faNum(p.inFile)}${p.old ? ` · ${faNum(p.old)} قدیمی` : ''}${p.existing ? ` · ${faNum(p.existing)} موجود` : ''}`}
                </span>
              </div>
            ))}
          </Card>
          <button className={`btn${total === 0 && mode === 'merge' ? ' dis' : ''}`} onClick={apply} disabled={total === 0 && mode === 'merge'}>
            {mode === 'replace' ? 'جایگزین کن و وارد کن' : 'ادغام و وارد کن'}
          </button>
        </>
      )}
      <BackToApp />
    </Page>
  );
}

export function PrivacyReport() {
  const [report, setReport] = useState(null);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    exportAll().then((all) => setReport(buildReport(all.tables))).catch(() => setMsg('نتوانستیم گزارش بسازیم؛ دوباره امتحان کن.'));
  }, []);

  const save = async (name, text, mime) => {
    try {
      const where = await saveFile(name, text, mime);
      setMsg(where ? `ذخیره شد: ${where}` : 'فایل آماده شد و برگهٔ اشتراک‌گذاری باز شد.');
    } catch {
      setMsg('نتوانستیم فایل بسازیم؛ دوباره امتحان کن. داده‌هایت امن است.');
    }
  };

  if (!report) return <Page tabs={false}><Top title="گزارش داده‌ها" back="/privacy" />{msg ? <p className="err">{msg}</p> : <Skeleton />}</Page>;
  const { range, habits, goals, focus, moods, tasks, daily, rates, obstacles, minVersion, revisions, skills } = report;
  const recent = daily.slice(-14);

  return (
    <Page tabs={false}>
      <Top title="گزارش داده‌ها" back="/privacy" />
      <p className="s">خلاصهٔ توصیفی از چیزهایی که ثبت کرده‌ای؛ فقط داده، بدون قضاوت.</p>
      {range.days === 0 ? (
        <Card kind="mint"><p className="s">هنوز داده‌ای ثبت نشده. با ثبت عادت‌ها و تمرکز، گزارش اینجا پر می‌شود.</p></Card>
      ) : (
        <>
          <Card kind="teal">
            <span className="lbl">از داده‌های تو</span>
            <p className="s">{faNum(range.days)} روز دارای ثبت، از {fmtDateFull(range.from)} تا {fmtDateFull(range.to)}.</p>
            <Bars values={recent.map((d) => d.habitsDone + d.habitsPartial)} label="ثبت عادت‌ها در ۱۴ روز اخیر" />
            <span className="xs">ستون نقطه‌چین یعنی در آن روز ثبتی نیست.</span>
          </Card>
          <Card>
            <h3>نرخ انجام عادت‌ها</h3>
            <p className="xs">سه عدد جدا از هم‌اند؛ روزهای ثبت‌نشده نه «انجام‌شده» شمرده می‌شوند و نه «انجام‌نشده».</p>
            <div className="row"><span className="grow">برنامه‌ریزی‌شده</span><span className="s">{faNum(rates.scheduled)}</span></div>
            <div className="row"><span className="grow">ثبت‌شده</span><span className="s">{faNum(rates.recorded)}</span></div>
            <div className="row"><span className="grow">ثبت‌نشده</span><span className="s">{faNum(rates.unrecorded)}</span></div>
            <div className="row"><span className="grow">انجام در میان ثبت‌شده‌ها</span><span className="s">{pctText(rates.rateOfRecorded)}</span></div>
            <div className="row"><span className="grow">انجام در میان همهٔ برنامه‌ریزی‌شده‌ها</span><span className="s">{pctText(rates.rateOfScheduled)}</span></div>
            <div className="row"><span className="grow">انجام با نسخهٔ حداقل</span><span className="s">{faNum(minVersion.done)}</span></div>
          </Card>
          <Card>
            <h3>مانع‌های گزارش‌شده</h3>
            {obstacles.length === 0 ? (
              <p className="xs">هنوز مانعی ثبت نشده یا داده کافی نیست.</p>
            ) : (
              obstacles.slice(0, 5).map((o) => (
                <div className="row" key={o.key}><span className="grow">{o.label}</span><span className="xs">{faNum(o.count)} بار</span></div>
              ))
            )}
          </Card>
          <Card>
            <h3>عادت‌ها</h3>
            {habits.length === 0 && <p className="xs">عادتی تعریف نشده.</p>}
            {habits.map((h) => (
              <div className="row" key={h.id}>
                <span className="grow">{h.title}{h.paused ? ' (متوقف)' : ''}</span>
                <span className="xs">{faNum(h.done)} انجام · {faNum(h.partial)} نیمه · {faNum(h.skipped)} ردشده · {faNum(h.logged)} ثبت · {faNum(h.rates.unrecorded)} ثبت‌نشده</span>
              </div>
            ))}
            {revisions.total > 0 && <p className="xs">{faNum(revisions.total)} تغییر در تعریف عادت‌ها نسخه‌بندی و نگه‌داری شده است.</p>}
          </Card>
          <Card>
            <h3>هدف‌ها</h3>
            {goals.length === 0 && <p className="xs">هدفی تعریف نشده.</p>}
            {goals.map((g) => (
              <div className="row" key={g.id}>
                <span className="grow">{g.title}</span>
                <span className="xs">{g.type === 'milestones' ? `${faNum(g.milestonesDone)} از ${faNum(g.milestonesTotal)} نقطه‌عطف` : `${faNum(g.done)} ثبت انجام`}</span>
              </div>
            ))}
          </Card>
          {skills.length > 0 && (
            <Card>
              <h3>پیشرفت مهارت</h3>
              <p className="xs">خودارزیابی‌های خودت؛ تلاش منظم لزوماً یعنی پیشرفت مشخصی نیست.</p>
              {skills.map((g) => (
                <div className="col" key={g.goalId}>
                  <span className="lbl">{g.title}</span>
                  {g.dimensions.map((d) => (
                    <div className="row" key={d.dimension}>
                      <span className="grow">{d.dimension}</span>
                      <span className="xs">{faNum(d.first)} ← {faNum(d.last)} ({faNum(d.count)} ثبت)</span>
                    </div>
                  ))}
                </div>
              ))}
            </Card>
          )}
          <Card>
            <h3>تمرکز</h3>
            <p className="s">{faNum(focus.sessions)} جلسه، {faNum(focus.actualMin)} دقیقه تمرکز واقعی از {faNum(focus.plannedMin)} دقیقه برنامه.</p>
            {focus.avgEnergy != null && <p className="xs">میانگین انرژی پس از جلسه: {faNum(focus.avgEnergy)} از ۱۰۰</p>}
          </Card>
          <Card>
            <h3>حال و انرژی</h3>
            {moods.records < 3 ? (
              <p className="xs">هنوز داده کافی نیست.</p>
            ) : (
              <>
                <div className="chips">
                  {Object.entries(moods.byMood).map(([k, v]) => <span className="chip teal" key={k}>{MOODS[k]?.label ?? k}: {faNum(v)}</span>)}
                </div>
                {moods.avgEnergy != null && <p className="xs">میانگین انرژی: {faNum(moods.avgEnergy)} از ۱۰۰</p>}
              </>
            )}
          </Card>
          <Card>
            <h3>کارها</h3>
            <p className="s">{faNum(tasks.done)} کار انجام‌شده از {faNum(tasks.total)} کار ثبت‌شده.</p>
          </Card>
        </>
      )}
      <Card kind="mint">
        <h3>خروجی برای تحلیل</h3>
        <p className="xs">ستون‌ها شامل تاریخ میلادی و شمسی‌اند؛ فایل‌ها UTF-8 هستند و مستقیم در Excel یا Google Sheets باز می‌شوند.</p>
        <button className="btn sm" onClick={() => save(`evolve-daily-${stamp()}.csv`, dailyCSV(report), 'text/csv')}>جدول روزانه (CSV)</button>
        <button className="btn sm s2" onClick={() => save(`evolve-habits-${stamp()}.csv`, habitsCSV(report), 'text/csv')}>خلاصهٔ عادت‌ها (CSV)</button>
        <button className="btn sm s2" onClick={() => save(`evolve-obstacles-${stamp()}.csv`, obstaclesCSV(report), 'text/csv')}>مانع‌ها (CSV)</button>
        <button className="btn sm s2" onClick={() => save(`evolve-skills-${stamp()}.csv`, skillsCSV(report), 'text/csv')}>پیشرفت مهارت (CSV)</button>
        <button className="btn sm s2" onClick={() => save(`evolve-report-${stamp()}.json`, JSON.stringify(report, null, 2), 'application/json')}>گزارش کامل (JSON)</button>
      </Card>
      {msg && <p className="s" role="status">{msg}</p>}
      <BackToApp />
    </Page>
  );
}
