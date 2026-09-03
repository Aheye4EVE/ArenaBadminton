export default function Loading() {
  return (
    <main className="route-state route-state--loading" aria-busy="true" aria-live="polite">
      <div className="route-state__orb" aria-hidden="true">🏸</div>
      <p className="section-eyebrow section-eyebrow--purple">Arena-Badminton</p>
      <h1>กำลังเปิดสนามให้คุณ...</h1>
      <div className="loading-bar" aria-hidden="true"><span /></div>
    </main>
  );
}
