import { TimerRing } from '@/features/shift-timer';

export function TimerPage() {
  return (
    <main className="page">
      <header className="page-header">
        <h1>Зміна</h1>
      </header>
      <section className="panel shift-panel">
        <TimerRing />
      </section>
    </main>
  );
}
