import { useEffect, useState } from 'react';

const fallbackInviteLink = 'https://discord.gg/tradeup';
const fallbackServerId = '906223735898509332';
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

const statusLabels = {
  online: 'Online',
  idle: 'Idle',
  dnd: 'Do Not Disturb',
  offline: 'Offline',
  unknown: 'Unknown'
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
    lastError: null,
    guildCount: 0,
    totalMembers: 0,
    uptimeSeconds: 0,
    guilds: []
  });
  const [controlState, setControlState] = useState({
    busy: false,
    message: null
  });
  const [guildActions, setGuildActions] = useState({});
  const [showPermissions, setShowPermissions] = useState({});
  const [showRoleGrant, setShowRoleGrant] = useState({});
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

    const loadBotHealth = () => {
      fetch('/api/bot-health')
        .then((response) => response.json())
        .then((data) => {
          setBotHealth({
            botOnline: Boolean(data.botOnline),
            botTag: data.botTag || null,
            tokenConfigured: Boolean(data.tokenConfigured),
            lastError: data.lastError || null,
            guildCount: Number.isInteger(data.guildCount) ? data.guildCount : 0,
            totalMembers: Number.isInteger(data.totalMembers) ? data.totalMembers : 0,
            uptimeSeconds: Number.isInteger(data.uptimeSeconds) ? data.uptimeSeconds : 0,
            guilds: Array.isArray(data.guilds) ? data.guilds : []
          });
        })
        .catch(() => {
          setBotHealth({
            botOnline: false,
            botTag: null,
            tokenConfigured: false,
            lastError: 'Unable to load bot health',
            guildCount: 0,
            totalMembers: 0,
            uptimeSeconds: 0,
            guilds: []
          });
        });
    };

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

    loadBotHealth();
    const intervalId = window.setInterval(loadBotHealth, 12000);
    return () => {
      window.clearInterval(intervalId);
    };
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
  const uptimeText = botHealth.uptimeSeconds > 0
    ? `${Math.floor(botHealth.uptimeSeconds / 3600)}h ${Math.floor((botHealth.uptimeSeconds % 3600) / 60)}m`
    : '0h 0m';

  const runControlAction = (action) => {
    if (controlState.busy) {
      return;
    }

    setControlState({ busy: true, message: `${action} in progress...` });
    fetch(`/api/bot-control?action=${action}`, { method: 'POST' })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.message || 'Control action failed');
        }

        const runtime = data.runtime || {};
        setBotHealth((current) => ({
          ...current,
          botOnline: Boolean(runtime.botOnline),
          botTag: runtime.botTag || null,
          tokenConfigured: Boolean(runtime.tokenConfigured),
          lastError: runtime.lastError || null,
          guildCount: Number.isInteger(runtime.guildCount) ? runtime.guildCount : 0,
          totalMembers: Number.isInteger(runtime.totalMembers) ? runtime.totalMembers : 0,
          uptimeSeconds: Number.isInteger(runtime.uptimeSeconds) ? runtime.uptimeSeconds : 0,
          guilds: Array.isArray(runtime.guilds) ? runtime.guilds : []
        }));
        setControlState({ busy: false, message: `Bot ${action} completed.` });
      })
      .catch((error) => {
        setControlState({ busy: false, message: error.message || 'Control action failed' });
      });
  };

  const leaveGuild = (guildId, guildName) => {
    if (guildActions[guildId]) return;
    
    if (!confirm(`Are you sure you want to leave "${guildName}"?`)) {
      return;
    }

    setGuildActions(prev => ({ ...prev, [guildId]: 'Leaving...' }));
    
    fetch(`/api/guild-leave/${guildId}`, { method: 'POST' })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.message || 'Failed to leave guild');
        }
        setGuildActions(prev => ({ ...prev, [guildId]: data.message || 'Left successfully' }));
        setTimeout(() => {
          setBotHealth(prev => ({
            ...prev,
            guilds: prev.guilds.filter(g => g.id !== guildId),
            guildCount: prev.guildCount - 1
          }));
          setGuildActions(prev => {
            const newState = { ...prev };
            delete newState[guildId];
            return newState;
          });
        }, 2000);
      })
      .catch((error) => {
        setGuildActions(prev => ({ ...prev, [guildId]: `Error: ${error.message}` }));
        setTimeout(() => {
          setGuildActions(prev => {
            const newState = { ...prev };
            delete newState[guildId];
            return newState;
          });
        }, 3000);
      });
  };

  const createInvite = (guildId, guildName) => {
    if (guildActions[guildId]) return;
    
    setGuildActions(prev => ({ ...prev, [guildId]: 'Creating invite...' }));
    
    fetch(`/api/guild-invite/${guildId}`, { method: 'POST' })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.message || 'Failed to create invite');
        }
        const inviteUrl = data.inviteUrl || `https://discord.gg/${data.code}`;
        setGuildActions(prev => ({ ...prev, [guildId]: `Invite: ${inviteUrl}` }));
        
        // Copy to clipboard
        navigator.clipboard.writeText(inviteUrl).catch(() => {});
        
        setTimeout(() => {
          setGuildActions(prev => {
            const newState = { ...prev };
            delete newState[guildId];
            return newState;
          });
        }, 8000);
      })
      .catch((error) => {
        setGuildActions(prev => ({ ...prev, [guildId]: `Error: ${error.message}` }));
        setTimeout(() => {
          setGuildActions(prev => {
            const newState = { ...prev };
            delete newState[guildId];
            return newState;
          });
        }, 3000);
      });
  };

  const grantRole = (guildId, guildName) => {
    const userId = prompt(`Enter the User ID to grant admin role in "${guildName}":`);
    if (!userId || !userId.trim()) {
      return;
    }

    setGuildActions(prev => ({ ...prev, [guildId]: 'Granting role...' }));
    
    fetch(`/api/guild-grant-role/${guildId}`, { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: userId.trim() })
    })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.message || 'Failed to grant role');
        }
        setGuildActions(prev => ({ ...prev, [guildId]: data.message || 'Role granted successfully' }));
        setTimeout(() => {
          setGuildActions(prev => {
            const newState = { ...prev };
            delete newState[guildId];
            return newState;
          });
        }, 5000);
      })
      .catch((error) => {
        setGuildActions(prev => ({ ...prev, [guildId]: `Error: ${error.message}` }));
        setTimeout(() => {
          setGuildActions(prev => {
            const newState = { ...prev };
            delete newState[guildId];
            return newState;
          });
        }, 3000);
      });
  };

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
                    {statusLabels[member.status] || statusLabels.offline}
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
          <a className="btn" href="https://discord.gg/tradeup" target="_blank" rel="noreferrer">Join Server</a>
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
        <>
          <section className="panel route-panel">
            <div className="bot-status-header">
              <div>
                <h2>Bot Status Dashboard</h2>
                <p className="bot-status-user">Verified as {authState.user?.globalName || authState.user?.username || authState.user?.id}</p>
              </div>
              <div className={`status-pill status-large ${botHealth.botOnline ? 'status-online' : 'status-offline'}`}>
                {botHealth.botOnline ? '🟢 Bot Online' : '⚫ Bot Offline'}
              </div>
            </div>

            {botHealth.botTag && (
              <div className="bot-client-info">
                <span className="bot-tag">{botHealth.botTag}</span>
                {botHealth.tokenConfigured && <span className="bot-badge">✓ Token Configured</span>}
              </div>
            )}

            <div className="bot-metrics-grid">
              <div className="metric-card">
                <div className="metric-icon">🖥️</div>
                <div className="metric-value">{botHealth.guildCount}</div>
                <div className="metric-label">Servers Connected</div>
              </div>
              <div className="metric-card">
                <div className="metric-icon">👥</div>
                <div className="metric-value">{botHealth.totalMembers.toLocaleString()}</div>
                <div className="metric-label">Total Members</div>
              </div>
              <div className="metric-card">
                <div className="metric-icon">⏱️</div>
                <div className="metric-value">{uptimeText}</div>
                <div className="metric-label">Uptime</div>
              </div>
              <div className="metric-card">
                <div className="metric-icon">⚡</div>
                <div className="metric-value">{botHealth.botOnline ? 'Active' : 'Inactive'}</div>
                <div className="metric-label">Status</div>
              </div>
            </div>

            <div className="bot-control-section">
              <h3>Bot Controls</h3>
              <div className="bot-actions">
                <button className="btn btn-control" type="button" onClick={() => runControlAction('start')} disabled={controlState.busy}>
                  ▶️ Start
                </button>
                <button className="btn btn-control" type="button" onClick={() => runControlAction('stop')} disabled={controlState.busy}>
                  ⏹️ Stop
                </button>
                <button className="btn btn-control" type="button" onClick={() => runControlAction('restart')} disabled={controlState.busy}>
                  🔄 Restart
                </button>
              </div>
              {controlState.message && (
                <div className={`control-message ${controlState.busy ? 'control-busy' : 'control-success'}`}>
                  {controlState.message}
                </div>
              )}
            </div>

            {!botHealth.tokenConfigured && (
              <div className="alert alert-warning">
                <span className="alert-icon">⚠️</span>
                <div>
                  <strong>Configuration Required</strong>
                  <p>DISCORD_BOT_TOKEN is not configured. Some features may be unavailable.</p>
                </div>
              </div>
            )}

            {botHealth.lastError && (
              <div className="alert alert-error">
                <span className="alert-icon">❌</span>
                <div>
                  <strong>Error Detected</strong>
                  <p>{botHealth.lastError}</p>
                </div>
              </div>
            )}

            <a className="btn btn-outline" href="/auth/logout">Log Out</a>
          </section>

          {botHealth.guilds.length > 0 && (
            <section className="panel route-panel">
              <h3>Connected Servers ({botHealth.guilds.length})</h3>
              <div className="guild-list-advanced">
                {botHealth.guilds.map((guild) => (
                  <div className="guild-card" key={guild.id}>
                    <div className="guild-header">
                      <div className="guild-name-badge">
                        <strong>{guild.name}</strong>
                        {guild.id === '906223735898509332' && <span className="primary-badge">Primary</span>}
                      </div>
                      <div className="guild-member-count">
                        👥 {Number.isInteger(guild.memberCount) ? guild.memberCount.toLocaleString() : 'Unknown'}
                      </div>
                    </div>
                    <div className="guild-id">ID: {guild.id}</div>
                    
                    {guild.inviter && (
                      <div className="guild-inviter">
                        Added by: <strong>{guild.inviter.tag || guild.inviter.username || guild.inviter.id}</strong>
                      </div>
                    )}

                    <div className="guild-permissions-summary">
                      {guild.hasAdmin && <span className="perm-badge admin">🛡️ Administrator</span>}
                      {!guild.hasAdmin && guild.hasManageRoles && <span className="perm-badge manage-roles">🎭 Manage Roles</span>}
                      {!guild.hasAdmin && !guild.hasManageRoles && <span className="perm-badge no-admin">⚠️ Limited Permissions</span>}
                    </div>

                    <div className="guild-actions">
                      <button 
                        className="btn-guild btn-guild-invite" 
                        onClick={() => createInvite(guild.id, guild.name)}
                        disabled={Boolean(guildActions[guild.id])}
                        title="Create and copy invite link"
                      >
                        🔗 Get Invite
                      </button>
                      
                      <button 
                        className="btn-guild btn-guild-perms" 
                        onClick={() => setShowPermissions(prev => ({ ...prev, [guild.id]: !prev[guild.id] }))}
                        title="Show bot permissions"
                      >
                        🔐 Permissions
                      </button>
                      
                      {(guild.hasAdmin || guild.hasManageRoles) && (
                        <button 
                          className="btn-guild btn-guild-role" 
                          onClick={() => grantRole(guild.id, guild.name)}
                          disabled={Boolean(guildActions[guild.id])}
                          title="Grant admin role to user"
                        >
                          👑 Grant Role
                        </button>
                      )}
                      
                      <button 
                        className="btn-guild btn-guild-leave" 
                        onClick={() => leaveGuild(guild.id, guild.name)}
                        disabled={Boolean(guildActions[guild.id])}
                        title="Leave this server"
                      >
                        🚪 Leave
                      </button>
                    </div>

                    {showPermissions[guild.id] && guild.permissions && (
                      <div className="permissions-list">
                        <h4>Bot Permissions:</h4>
                        <div className="permissions-grid">
                          {guild.permissions.slice(0, 20).map((perm, idx) => (
                            <span key={idx} className="permission-item">{perm}</span>
                          ))}
                          {guild.permissions.length > 20 && (
                            <span className="permission-item">+{guild.permissions.length - 20} more</span>
                          )}
                        </div>
                      </div>
                    )}

                    {guildActions[guild.id] && (
                      <div className="guild-action-message">
                        {guildActions[guild.id]}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
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
            <a className="btn" href="https://discord.gg/tradeup" target="_blank" rel="noreferrer">Request a Middleman</a>
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
            <img
              className="brand-logo"
              src="/favicon.svg"
              alt="TradeUp logo"
              loading="eager"
            />
            <div className="brand">Trade<span>Up</span></div>
          </div>
          <a className="btn" href="https://discord.gg/tradeup" target="_blank" rel="noreferrer">Join Server</a>
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
