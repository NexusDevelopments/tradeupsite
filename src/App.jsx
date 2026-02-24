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
          <p className="eyebrow">Roblox Trading Middleman</p>
          <h1>Safe Roblox Trades with Verified Middlemen</h1>
          <p className="hero-subtext">
            TradeUp connects Roblox traders with trusted middlemen for secure limited, account, and item deals backed by clear trade proof standards.
          </p>
          <div className="hero-actions">
            <a className="btn" href={inviteLink} target="_blank" rel="noreferrer">Request a Middleman</a>
            <a className="btn btn-outline" href="#identity">Verify Official Server</a>
          </div>
          <div className="stats">3 Online · 4 Members</div>
        </section>

        <section className="cards">
          <article className="card">
            <div className="icon">◆</div>
            <h3>Fast Middleman Queue</h3>
            <p>Open a ticket and get matched with an available Roblox middleman quickly.</p>
          </article>
          <article className="card">
            <div className="icon">✓</div>
            <h3>Scam Prevention First</h3>
            <p>Verified staff, vouch records, and strict proof checks for every trade.</p>
          </article>
          <article className="card">
            <div className="icon">⚡</div>
            <h3>Built for Roblox Traders</h3>
            <p>Focused support for limited trading, cross-trades, and account deals.</p>
          </article>
        </section>

        <section className="split" id="identity">
          <article className="panel">
            <h2>Verify Our Identity</h2>
            <p>Always confirm this server ID before sending items or Robux to avoid fake middleman servers.</p>
            <div className="server-id">{serverId}</div>
          </article>

          <article className="panel">
            <h2>Middleman Team</h2>
            <p>Our staff is trained to keep Roblox trades clear, documented, and secure.</p>
            <div className="founder">
              <div className="avatar">T</div>
              <div>
                <strong>TradeUp MM Staff</strong>
                <p>Verified Roblox Middlemen</p>
              </div>
            </div>
          </article>
        </section>

        <section className="panel links">
          <h2>Quick Links</h2>
          <ul>
            <li><a href={inviteLink} target="_blank" rel="noreferrer">Join Roblox Middleman Discord</a></li>
            <li><a href="#identity">Check Server ID</a></li>
          </ul>
        </section>
      </main>

      <footer className="footer">© 2026 TradeUp Roblox Middleman. All rights reserved.</footer>
    </>
  );
}

export default App;
