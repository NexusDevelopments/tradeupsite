import { useEffect, useState } from 'react';

const fallbackInviteLink = 'https://discord.gg/rM43kyut';
const fallbackServerId = '1470184067776647284';
const fallbackStaffMembers = [
  {
    userId: '1057806013639704676',
    role: 'Owner',
    username: null,
    displayName: null,
    avatarUrl: null,
    status: 'offline',
    resolved: false
  },
  {
    userId: '1123305643458183228',
    role: 'Owner',
    username: null,
    displayName: null,
    avatarUrl: null,
    status: 'offline',
    resolved: false
  },
  {
    userId: '1435310225010987088',
    role: 'Developer',
    username: null,
    displayName: null,
    avatarUrl: null,
    status: 'offline',
    resolved: false
  }
];

const tabs = [
  { label: 'Home', path: '/' },
  { label: 'Server ID', path: '/server-id' },
  { label: 'Our Team', path: '/team' },
  { label: 'Join Server', path: '/join-server' }
];

const statusEmoji = {
  online: '🟢',
  idle: '🌙',
  dnd: '⛔',
  offline: '⚫',
  unknown: '⚪'
};

function normalizePath(pathname) {
  const path = pathname || '/';
  if (path === '/') {
    return '/';
  }
  return path.endsWith('/') ? path.slice(0, -1) : path;
}

function App() {
  const [serverData, setServerData] = useState({
    inviteLink: fallbackInviteLink,
    serverId: fallbackServerId,
    serverName: 'TradeUp',
    iconUrl: null,
    memberCount: null,
    onlineCount: null,
    staffMembers: fallbackStaffMembers,
    supportsFullLookup: false,
    botOnline: false,
    botTag: null,
    botLastError: null
  });
  const [authState, setAuthState] = useState({
    authenticated: false,
    authorized: false,
    user: null,
    message: null
  });
  const [botHealth, setBotHealth] = useState({
    botOnline: false,
    botTag: null,
    tokenConfigured: false,
    lastError: null
  });
  const [currentPath, setCurrentPath] = useState(normalizePath(window.location.pathname));

  useEffect(() => {
    let isMounted = true;

    const loadServerData = () => {
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
              : fallbackStaffMembers,
            supportsFullLookup: Boolean(data.supportsFullLookup),
            botOnline: Boolean(data.botOnline),
            botTag: data.botTag || null,
            botLastError: data.botLastError || null
          });
        })
        .catch(() => {});
    };

    loadServerData();
    const intervalId = window.setInterval(loadServerData, 30000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    if (currentPath !== '/bot-status') {
      return;
    }

    fetch('/api/auth/me')
      .then((response) => response.json())
      .then((data) => {
        setAuthState({
          authenticated: Boolean(data.authenticated),
          authorized: Boolean(data.authorized),
          user: data.user || null,
          message: data.message || null
        });
      })
      .catch(() => {
        setAuthState({
          authenticated: false,
          authorized: false,
          user: null,
          message: 'You are not a valid id please contact a Developer to be added to the system'
        });
      });

    fetch('/api/bot-health')
      .then((response) => response.json())
      .then((data) => {
        setBotHealth({
          botOnline: Boolean(data.botOnline),
          botTag: data.botTag || null,
          tokenConfigured: Boolean(data.tokenConfigured),
          lastError: data.lastError || null
        });
      })
      .catch(() => {
        setBotHealth({
          botOnline: false,
          botTag: null,
          tokenConfigured: false,
          lastError: 'Unable to load bot health'
        });
      });
  }, [currentPath]);

  useEffect(() => {
    const iconHref = serverData.iconUrl || '/favicon.svg';
    let faviconLink = document.querySelector('link[rel="icon"]');

    if (!faviconLink) {
      faviconLink = document.createElement('link');
      faviconLink.setAttribute('rel', 'icon');
      document.head.appendChild(faviconLink);
    }

    faviconLink.setAttribute('type', 'image/png');
    faviconLink.setAttribute('href', `${iconHref}${iconHref.includes('?') ? '&' : '?'}v=${Date.now()}`);
  }, [serverData.iconUrl]);

  useEffect(() => {
    const onPopState = () => {
      setCurrentPath(normalizePath(window.location.pathname));
    };

    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
    };
  }, []);

  const statsText = serverData.onlineCount !== null && serverData.memberCount !== null
    ? `${serverData.onlineCount.toLocaleString()} Online · ${serverData.memberCount.toLocaleString()} Members`
    : 'Live member data unavailable';

  const navigateTo = (path) => {
    const normalizedPath = normalizePath(path);
    if (normalizedPath === currentPath) {
      return;
    }

    window.history.pushState({}, '', normalizedPath);
    setCurrentPath(normalizedPath);
  };

  const handleNavClick = (event, path) => {
    event.preventDefault();
    navigateTo(path);
  };

  const validPaths = new Set([...tabs.map((tab) => tab.path), '/bot-status']);
  const activePath = validPaths.has(currentPath) ? currentPath : '/';
  const pageError = new URLSearchParams(window.location.search).get('error');

  const renderRouteContent = () => {
    if (activePath === '/server-id') {
      return (
        <section className="panel route-panel">
          <h2>Official Server ID</h2>
          <p>Verify this ID before trading so you avoid fake servers and fake middlemen.</p>
          <div className="server-id">{serverData.serverId}</div>
        </section>
      );
    }

    if (activePath === '/team') {
      return (
        <section className="panel route-panel">
          <h2>Our Team</h2>
          <p>Official TradeUp staff members from Discord user ID lookup and live status.</p>
          {!serverData.botOnline && (
            <p className="lookup-note">Bot presence stream offline{serverData.botLastError ? `: ${serverData.botLastError}` : ''}</p>
          )}
          {!serverData.supportsFullLookup && (
            <p className="lookup-note">Set DISCORD_BOT_TOKEN in Railway to load full username and avatar for offline users.</p>
          )}
          <div className="staff-list">
            {serverData.staffMembers.map((member) => (
              <div className="founder" key={member.userId}>
                <div className="avatar-wrap">
                  {member.avatarUrl ? (
                    <img className="avatar avatar-img" src={member.avatarUrl} alt={`${member.displayName || member.role} avatar`} loading="lazy" />
                  ) : (
                    <div className="avatar">{member.role[0]}</div>
                  )}
                  <span className={`avatar-status status-${member.status || 'offline'}`}>
                    {statusEmoji[member.status] || statusEmoji.offline}
                  </span>
                </div>
                <div>
                  <strong>{member.displayName || 'Profile unavailable'}</strong>
                  <p>{member.username ? `@${member.username}` : 'Username unavailable'}</p>
                  <p>{member.role} · ID: {member.userId}</p>
                  <div className={`status-pill status-${member.status || 'offline'}`}>
                    Status: {member.status || 'offline'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      );
    }

    if (activePath === '/join-server') {
      return (
        <section className="panel route-panel">
          <h2>Join Our Discord Server</h2>
          <p>Use the official invite below to enter the TradeUp Roblox middleman server.</p>
          <a className="btn" href={serverData.inviteLink} target="_blank" rel="noreferrer">Join Server</a>
        </section>
      );
    }

    if (activePath === '/bot-status') {
      if (!authState.authorized) {
        return (
          <section className="panel route-panel">
            <h2>Bot Status Verification</h2>
            <p>Verify with Discord OAuth to access this page.</p>
            {pageError === 'not-allowed' && (
              <p className="lookup-note">You are not a valid id please contact a Developer to be added to the system</p>
            )}
            {authState.message && (
              <p className="lookup-note">{authState.message}</p>
            )}
            <a className="btn" href="/auth/discord?redirect=/bot-status">Verify</a>
          </section>
        );
      }

      return (
        <section className="panel route-panel">
          <h2>Bot Status</h2>
          <p>Verified as {authState.user?.globalName || authState.user?.username || authState.user?.id}</p>
          <div className={`status-pill ${botHealth.botOnline ? 'status-online' : 'status-offline'}`}>
            {botHealth.botOnline ? 'Bot Online' : 'Bot Offline'}
          </div>
          {botHealth.botTag && <p>Client: {botHealth.botTag}</p>}
          {!botHealth.tokenConfigured && <p className="lookup-note">DISCORD_BOT_TOKEN is not configured.</p>}
          {botHealth.lastError && <p className="lookup-note">Error: {botHealth.lastError}</p>}
          <a className="btn btn-outline" href="/auth/logout">Log Out</a>
        </section>
      );
    }

    return (
      <>
        <section className="hero">
          <p className="eyebrow">Roblox Trading Middleman</p>
          <h1>Safe Roblox Trades with Verified Middlemen</h1>
          <p className="hero-subtext">
            TradeUp connects Roblox traders with trusted middlemen for secure limited, account, and item deals backed by clear trade proof standards.
          </p>
          <div className="hero-actions">
            <a className="btn" href={serverData.inviteLink} target="_blank" rel="noreferrer">Request a Middleman</a>
            <a className="btn btn-outline" href="/server-id" onClick={(event) => handleNavClick(event, '/server-id')}>Verify Official Server</a>
          </div>
          <div className="stats">{statsText}</div>
        </section>

        <section className="cards">
          <article className="card">
            <div className="icon" />
            <h3>Fast Middleman Queue</h3>
            <p>Open a ticket and get matched with an available Roblox middleman quickly.</p>
          </article>
          <article className="card">
            <div className="icon" />
            <h3>Scam Prevention First</h3>
            <p>Verified staff, vouch records, and strict proof checks for every trade.</p>
          </article>
          <article className="card">
            <div className="icon" />
            <h3>Built for Roblox Traders</h3>
            <p>Focused support for limited trading, cross-trades, and account deals.</p>
          </article>
        </section>
      </>
    );
  };

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
        <div className="container tabs">
          {tabs.map((tab) => (
            <a
              key={tab.path}
              href={tab.path}
              onClick={(event) => handleNavClick(event, tab.path)}
              className={`tab ${activePath === tab.path ? 'tab-active' : ''}`}
            >
              {tab.label}
            </a>
          ))}
        </div>
      </header>

      <main className="container">
        {renderRouteContent()}

        <section className="panel links route-panel">
          <h2>Quick Links</h2>
          <ul>
            <li><a href={serverData.inviteLink} target="_blank" rel="noreferrer">Join Roblox Middleman Discord</a></li>
            <li><a href="/server-id" onClick={(event) => handleNavClick(event, '/server-id')}>Check Server ID</a></li>
            <li><a href="/team" onClick={(event) => handleNavClick(event, '/team')}>View Team</a></li>
          </ul>
        </section>
      </main>

      <footer className="footer">© 2026 TradeUp Roblox Middleman. All rights reserved.</footer>
    </>
  );
}

export default App;
