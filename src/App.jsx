import { useEffect, useState } from 'react';

const fallbackInviteLink = 'https://discord.gg/rM43kyut';
const fallbackServerId = '1470184067776647284';
const fallbackStaffMembers = [
  { userId: '1057806013639704676', role: 'Owner' },
  { userId: '1123305643458183228', role: 'Owner' },
  { userId: '1435310225010987088', role: 'Developer' }
];

function App() {
  const [serverData, setServerData] = useState({
    inviteLink: fallbackInviteLink,
    serverId: fallbackServerId,
    serverName: 'TradeUp',
    iconUrl: null,
    memberCount: null,
    onlineCount: null,
    staffMembers: fallbackStaffMembers
  });

  useEffect(() => {
    let isMounted = true;

    fetch('/api/discord-server')
      .then((response) => response.json())
      .then((data) => {
        if (!isMounted) {
          return;
        }

        setServerData({
          inviteLink: data.inviteLink || fallbackInviteLink,
          serverId: data.serverId || fallbackServerId,
          serverName: data.serverName || 'TradeUp',
          iconUrl: data.iconUrl || null,
          memberCount: Number.isInteger(data.memberCount) ? data.memberCount : null,
          onlineCount: Number.isInteger(data.onlineCount) ? data.onlineCount : null,
          staffMembers: Array.isArray(data.staffMembers) && data.staffMembers.length > 0
            ? data.staffMembers
            : fallbackStaffMembers
        });
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  const statsText = serverData.onlineCount !== null && serverData.memberCount !== null
    ? `${serverData.onlineCount.toLocaleString()} Online · ${serverData.memberCount.toLocaleString()} Members`
    : 'Live member data unavailable';

  return (
    <>
      <header className="site-header">
        <div className="container nav">
          <div className="brand-wrap">
            {serverData.iconUrl ? (
              <img
                className="brand-logo"
                src={serverData.iconUrl}
                alt={`${serverData.serverName} logo`}
                loading="lazy"
              />
            ) : (
              <div className="brand-logo brand-logo-fallback">T</div>
            )}
            <div className="brand">Trade<span>Up</span></div>
          </div>
          <a className="btn" href={serverData.inviteLink} target="_blank" rel="noreferrer">Join Server</a>
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
            <a className="btn" href={serverData.inviteLink} target="_blank" rel="noreferrer">Request a Middleman</a>
            <a className="btn btn-outline" href="#identity">Verify Official Server</a>
          </div>
          <div className="stats">{statsText}</div>
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
            <div className="server-id">{serverData.serverId}</div>
          </article>

          <article className="panel">
            <h2>Middleman Team</h2>
            <p>Our staff is trained to keep Roblox trades clear, documented, and secure.</p>
            <div className="staff-list">
              {serverData.staffMembers.map((member) => (
                <div className="founder" key={member.userId}>
                  <div className="avatar">{member.role[0]}</div>
                  <div>
                    <strong>{member.role}</strong>
                    <p>ID: {member.userId}</p>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="panel links">
          <h2>Quick Links</h2>
          <ul>
            <li><a href={serverData.inviteLink} target="_blank" rel="noreferrer">Join Roblox Middleman Discord</a></li>
            <li><a href="#identity">Check Server ID</a></li>
          </ul>
        </section>
      </main>

      <footer className="footer">© 2026 TradeUp Roblox Middleman. All rights reserved.</footer>
    </>
  );
}

export default App;
