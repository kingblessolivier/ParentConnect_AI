export default function Home() {
  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem', maxWidth: 640 }}>
      <h1>ParentConnect AI — Staff Console</h1>
      <p>
        Scaffold only. The admin, clinical-review, child-protection-officer, and M&amp;E dashboard
        consoles are built in Phase 1 (see <code>docs/delivery/roadmap.md</code>).
      </p>
      <p>
        This console is for staff, not parents. It never exposes another user&apos;s conversation
        content (NFR-10); clinical review sees anonymised samples only.
      </p>
    </main>
  );
}
