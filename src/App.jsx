import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { ToastProvider, TabBar, Skeleton } from './ui.jsx';
import { getKV, prune, useKV } from './db.js';
import { Welcome, Intro, Personalize, Setup } from './screens/Onboarding.jsx';
import { GoalsList, GoalForm, GoalDetail } from './screens/Goals.jsx';
import { HabitsList, HabitForm, HabitDetail, HabitsLog } from './screens/Habits.jsx';
import { Today } from './screens/Today.jsx';
import { FocusHome, FocusRun, FocusEnd, FocusHistory, FocusStats } from './screens/Focus.jsx';
import { Plan, PlanReview, Calendar, CalendarDay, CalendarWeek } from './screens/Plan.jsx';
import { ReflectHome, Notes, NoteEdit, Mood, MoodTrend } from './screens/Reflect.jsx';
import { ReviewDay, ReviewWeek } from './screens/Reviews.jsx';
import { Insights } from './screens/Insights.jsx';
import { Coach } from './screens/Coach.jsx';
import { AlertSettings, Profile, ProfileEdit, Prefs, Privacy, PrivacyExport, PrivacyDelete } from './screens/Settings.jsx';

import AlertBanner from './AlertBanner.jsx';
import { useFocusWatcher, useNotifSync } from './alerts.js';
import { foldBank } from './game.js';
import { GamePage, Howto } from './screens/Game.jsx';
import { About } from './screens/About.jsx';
import { PrivacyImport, PrivacyReport } from './screens/DataScreens.jsx';
import { CoachExport } from './screens/CoachExport.jsx';

const ONBOARDING = ['/welcome', '/intro', '/personalize', '/setup'];
const TAB_ROOTS = ['/today', '/goals', '/habits', '/focus', '/reflect'];

export default function App() {
  const { pathname } = useLocation();
  const nav = useNavigate();
  useFocusWatcher();
  useNotifSync();
  const [profile] = useKV('profile', null);
  const [prefs] = useKV('prefs', {});

  useEffect(() => {
    const run = () => foldBank().catch(() => {}).then(() => prune()).catch(() => {});
    run();
    document.addEventListener('visibilitychange', run);
    navigator.storage?.persist?.();
    return () => document.removeEventListener('visibilitychange', run);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('fs-lg', !!prefs?.big);
    document.documentElement.classList.toggle('reduce', !!prefs?.reduce);
  }, [prefs]);

  // لایو‌کوئری بعد از ذخیرهٔ پروفایل کمی دیر به‌روز می‌شود؛ پیش از هدایت، یک بار مستقیم می‌خوانیم
  const gated = profile === null && !ONBOARDING.includes(pathname);
  useEffect(() => {
    if (gated) getKV('profile').then((p) => !p && nav('/welcome', { replace: true }));
  }, [gated, nav]);

  if (profile === undefined || gated) return <main className="app"><div className="body"><Skeleton /></div></main>;

  return (
    <ToastProvider>
      <main className="app">
        <AlertBanner />
        <Routes>
          <Route path="/" element={<Navigate to="/today" replace />} />
          <Route path="/welcome" element={<Welcome />} />
          <Route path="/intro" element={<Intro />} />
          <Route path="/personalize" element={<Personalize />} />
          <Route path="/setup" element={<Setup />} />
          <Route path="/today" element={<Today />} />
          <Route path="/goals" element={<GoalsList />} />
          <Route path="/goals/new" element={<GoalForm />} />
          <Route path="/goals/:id" element={<GoalDetail />} />
          <Route path="/goals/:id/edit" element={<GoalForm />} />
          <Route path="/habits" element={<HabitsList />} />
          <Route path="/habits/new" element={<HabitForm />} />
          <Route path="/habits/log" element={<HabitsLog />} />
          <Route path="/habits/:id" element={<HabitDetail />} />
          <Route path="/habits/:id/edit" element={<HabitForm />} />
          <Route path="/focus" element={<FocusHome />} />
          <Route path="/focus/run" element={<FocusRun />} />
          <Route path="/focus/end" element={<FocusEnd />} />
          <Route path="/focus/history" element={<FocusHistory />} />
          <Route path="/focus/stats" element={<FocusStats />} />
          <Route path="/plan" element={<Plan />} />
          <Route path="/plan/review" element={<PlanReview />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/calendar/day/:d" element={<CalendarDay />} />
          <Route path="/calendar/week" element={<CalendarWeek />} />
          <Route path="/reflect" element={<ReflectHome />} />
          <Route path="/notes" element={<Notes />} />
          <Route path="/notes/new" element={<NoteEdit />} />
          <Route path="/notes/:id" element={<NoteEdit />} />
          <Route path="/mood" element={<Mood />} />
          <Route path="/mood/trend" element={<MoodTrend />} />
          <Route path="/review/day" element={<ReviewDay />} />
          <Route path="/review/week" element={<ReviewWeek />} />
          <Route path="/insights" element={<Insights />} />
          <Route path="/coach" element={<Coach />} />
          <Route path="/notifications" element={<AlertSettings />} />
          <Route path="/notifications/settings" element={<Navigate to="/notifications" replace />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/edit" element={<ProfileEdit />} />
          <Route path="/prefs" element={<Prefs />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/privacy/export" element={<PrivacyExport />} />
          <Route path="/privacy/import" element={<PrivacyImport />} />
          <Route path="/privacy/coach" element={<CoachExport />} />
          <Route path="/privacy/report" element={<PrivacyReport />} />
          <Route path="/game" element={<GamePage />} />
          <Route path="/howto" element={<Howto />} />
          <Route path="/about" element={<About />} />
          <Route path="/privacy/delete" element={<PrivacyDelete />} />
          <Route path="*" element={<Navigate to="/today" replace />} />
        </Routes>
        {profile && TAB_ROOTS.some((r) => pathname === r) && <TabBar />}
      </main>
    </ToastProvider>
  );
}
