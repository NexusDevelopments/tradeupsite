const inviteLink = 'https://discord.gg/rM43kyut';
const serverId = '1470184067776647284';

function App() {
  return (
    <>
      <header className="site-header">
        <div className="container nav">
          <div className="brand">Trade<span>Up</span></div>
          <a className="btn" href={inviteLink} target="_blank" rel="noreferrer">Join Server</a>
        </div>
      </header>

      <main className="container">
        <section className="hero">
          <p className="eyebrow">Trusted Marketplace Community</p>
          <h1>The Premier Destination for Elite Coders</h1>
          <p className="hero-subtext">
            TradeUp is a premium marketplace for collectors, investors, and traders who want a safe, active, and high-quality trading network.
          </p>
          <div className="hero-actions">
            <a className="btn" href={inviteLink} target="_blank" rel="noreferrer">Join TradeUp</a>
            <a className="btn btn-outline" href="#identity">Verify Server</a>
          </div>
          <div className="stats">3 Online · 4 Members</div>
        </section>

        <section className="cards">
          <article className="card">
            <div className="icon">◆</div>
            <h3>A Thriving Marketplace</h3>
            <p>Premium trading hub powered by an active and serious community.</p>
          </article>
          <article className="card">
            <div className="icon">✓</div>
            <h3>Safety &amp; Security</h3>
            <p>Verified members, trusted middlemen, and clear trading standards.</p>
          </article>
          <article className="card">
            <div className="icon">⚡</div>
            <h3>Active Community</h3>
            <p>Daily discussions, events, giveaways, and consistent support.</p>
          </article>
        </section>

        <section className="split" id="identity">
          <article className="panel">
            <h2>Verify Our Identity</h2>
            <p>Always verify the server ID before trading to avoid impersonators.</p>
            <div className="server-id">{serverId}</div>
          </article>

          <article className="panel">
            <h2>Our Team</h2>
            <p>Built and maintained to keep TradeUp clean, safe, and reliable.</p>
            <div className="founder">
              <div className="avatar">T</div>
              <div>
                <strong>TradeUp Core</strong>
                <p>Community Management</p>
              </div>
            </div>
          </article>
        </section>

        <section className="panel links">
          <h2>Quick Links</h2>
          <ul>
            <li><a href={inviteLink} target="_blank" rel="noreferrer">Join Discord</a></li>
            <li><a href="#identity">Check Server ID</a></li>
          </ul>
        </section>
      </main>

      <footer className="footer">© 2026 TradeUp. All rights reserved.</footer>
    </>
  );
}

export default App;
