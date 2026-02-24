const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const port = process.env.PORT || 3000;
const root = path.join(__dirname, 'dist');
const inviteCode = 'rM43kyut';
const inviteLink = `https://discord.gg/${inviteCode}`;
const serverId = '1470184067776647284';
const permanentInviteUrl = (process.env.PERMANENT_INVITE_URL || '').trim();
const rawDiscordToken = (process.env.DISCORD_BOT_TOKEN || process.env.DISCORD_TOKEN || '').trim();
const discordBotToken = rawDiscordToken.replace(/^Bot\s+/i, '');
const discordClientId = (process.env.DISCORD_CLIENT_ID || '').trim();
const discordClientSecret = (process.env.DISCORD_CLIENT_SECRET || '').trim();
const configuredRedirectUri = (process.env.DISCORD_REDIRECT_URI || '').trim();
const publicBaseUrl = (process.env.PUBLIC_BASE_URL || process.env.APP_BASE_URL || '').trim();
let discordClient = null;
let discordClientReady = false;
let discordClientTag = null;
let discordLastError = null;
const authSessions = new Map();
const oauthStates = new Map();

const staffMembers = [
  { userId: '1057806013639704676', role: 'Owner' },
  { userId: '1123305643458183228', role: 'Owner' },
  { userId: '1435310225010987088', role: 'Developer' }
];
const allowedUserIds = new Set(staffMembers.map((member) => member.userId));

function getBaseUrl(req) {
  const forwardedProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  const proto = forwardedProto || 'http';
  const host = req.headers.host;
  return `${proto}://${host}`;
}

function normalizeRedirectUri(uri) {
  if (!uri) {
    return null;
  }

  let normalized = uri.trim();
  if (/^https?:\/[^/]/i.test(normalized)) {
    normalized = normalized.replace(/^http:\//i, 'http://').replace(/^https:\//i, 'https://');
  }

  try {
    const parsed = new URL(normalized);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

function getRedirectUri(req) {
  const normalizedConfiguredUri = normalizeRedirectUri(configuredRedirectUri);
  if (normalizedConfiguredUri) {
    return normalizedConfiguredUri;
  }

  const normalizedPublicBaseUrl = normalizeRedirectUri(publicBaseUrl);
  if (normalizedPublicBaseUrl) {
    const parsedBase = new URL(normalizedPublicBaseUrl);
    parsedBase.pathname = '/auth/discord/callback';
    parsedBase.search = '';
    parsedBase.hash = '';
    return parsedBase.toString();
  }

  return `${getBaseUrl(req)}/auth/discord/callback`;
}

function parseCookies(req) {
  const cookieHeader = req.headers.cookie || '';
  return cookieHeader
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((accumulator, part) => {
      const separatorIndex = part.indexOf('=');
      if (separatorIndex === -1) {
        return accumulator;
      }

      const key = part.slice(0, separatorIndex);
      const value = decodeURIComponent(part.slice(separatorIndex + 1));
      accumulator[key] = value;
      return accumulator;
    }, {});
}

function createSession(user) {
  const sessionId = crypto.randomBytes(24).toString('hex');
  const expiresAt = Date.now() + (1000 * 60 * 60 * 8);
  authSessions.set(sessionId, { user, expiresAt });
  return sessionId;
}

function getSessionUser(req) {
  const cookies = parseCookies(req);
  const sessionId = cookies.tradeup_session;
  if (!sessionId) {
    return null;
  }

  const session = authSessions.get(sessionId);
  if (!session || session.expiresAt < Date.now()) {
    authSessions.delete(sessionId);
    return null;
  }

  return session.user;
}

function getSessionCookie(sessionId, req) {
  const secureCookie = (req.headers['x-forwarded-proto'] || '').includes('https') ? '; Secure' : '';
  return `tradeup_session=${encodeURIComponent(sessionId)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=28800${secureCookie}`;
}

function clearSessionCookie(req) {
  const secureCookie = (req.headers['x-forwarded-proto'] || '').includes('https') ? '; Secure' : '';
  return `tradeup_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secureCookie}`;
}

function sendJson(res, payload, statusCode = 200, extraHeaders = {}) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8', ...extraHeaders });
  res.end(JSON.stringify(payload));
}

async function exchangeDiscordCodeForUser(code, redirectUri) {
  if (!discordClientId || !discordClientSecret) {
    throw new Error('Missing DISCORD_CLIENT_ID or DISCORD_CLIENT_SECRET');
  }

  const tokenResponse = await fetch('https://discord.com/api/v10/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: discordClientId,
      client_secret: discordClientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri
    })
  });

  if (!tokenResponse.ok) {
    throw new Error(`Discord token exchange failed (${tokenResponse.status})`);
  }

  const tokenData = await tokenResponse.json();
  const accessToken = tokenData.access_token;
  if (!accessToken) {
    throw new Error('Discord access token missing');
  }

  const userResponse = await fetch('https://discord.com/api/v10/users/@me', {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!userResponse.ok) {
    throw new Error(`Discord user fetch failed (${userResponse.status})`);
  }

  return userResponse.json();
}

function normalizeDiscordStatus(status) {
  if (status === 'online' || status === 'idle' || status === 'dnd') {
    return status;
  }
  if (status === 'invisible') {
    return 'offline';
  }
  return 'offline';
}

async function getStaffMemberFromBot(guildId, userId) {
  if (!discordClientReady || !discordClient) {
    return null;
  }

  try {
    const guild = await discordClient.guilds.fetch(guildId);
    const member = await guild.members.fetch(userId);
    const user = member?.user || await discordClient.users.fetch(userId);
    const presence = await guild.presences.fetch(userId).catch(() => null);
    const resolvedStatus = presence?.status || member?.presence?.status || null;

    return {
      username: user?.username || null,
      displayName: member?.displayName || user?.globalName || user?.username || null,
      avatarUrl: user?.displayAvatarURL({ extension: 'png', size: 256 }) || null,
      status: resolvedStatus ? normalizeDiscordStatus(resolvedStatus) : null
    };
  } catch {
    return null;
  }
}

async function startDiscordBotClient() {
  if (!discordBotToken) {
    discordLastError = 'Missing DISCORD_BOT_TOKEN (or DISCORD_TOKEN)';
    return;
  }

  try {
    const { Client, GatewayIntentBits } = require('discord.js');

    discordClient = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences
      ]
    });

    discordClient.on('ready', () => {
      discordClientReady = true;
      discordClientTag = discordClient.user?.tag || null;
      discordLastError = null;
      console.log(`Discord bot online as ${discordClient.user?.tag || 'unknown'}`);
    });

    discordClient.on('shardDisconnect', () => {
      discordClientReady = false;
    });

    discordClient.on('shardResume', () => {
      discordClientReady = true;
    });

    discordClient.on('error', (error) => {
      discordLastError = error.message;
      console.error('Discord client error:', error.message);
    });

    discordClient.on('warn', (warning) => {
      console.warn('Discord client warning:', warning);
    });

    await discordClient.login(discordBotToken);
  } catch (error) {
    discordLastError = error.message;
    console.error('Discord bot startup failed:', error.message);
  }
}

async function getWidgetMembers(guildId) {
  if (!guildId) {
    return [];
  }

  const response = await fetch(`https://discord.com/api/guilds/${guildId}/widget.json`);
  if (!response.ok) {
    return [];
  }

  const widgetData = await response.json();
  if (!widgetData || !Array.isArray(widgetData.members)) {
    return [];
  }

  return widgetData.members;
}

async function discordApiGet(url) {
  if (!discordBotToken) {
    return null;
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bot ${discordBotToken}`
    }
  });

  if (!response.ok) {
    return null;
  }

  return response.json();
}

function getUserAvatarUrl(user) {
  if (!user || !user.id || !user.avatar) {
    return null;
  }

  return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=256`;
}

async function resolveStaffMember(staffMember, guildId, widgetMembers) {
  const widgetMember = widgetMembers.find((member) => String(member.id) === String(staffMember.userId));
  const botMember = await getStaffMemberFromBot(guildId, staffMember.userId);
  const userFromApi = await discordApiGet(`https://discord.com/api/v10/users/${staffMember.userId}`);
  const guildMemberFromApi = await discordApiGet(`https://discord.com/api/v10/guilds/${guildId}/members/${staffMember.userId}`);

  const username = botMember?.username || userFromApi?.username || widgetMember?.username || null;
  const displayName = botMember?.displayName
    || guildMemberFromApi?.nick
    || userFromApi?.global_name
    || widgetMember?.global_name
    || username;
  const avatarUrl = botMember?.avatarUrl || getUserAvatarUrl(userFromApi) || widgetMember?.avatar_url || null;
  const status = botMember?.status
    || widgetMember?.status
    || (guildMemberFromApi ? 'unknown' : 'offline');

  return {
    userId: staffMember.userId,
    role: staffMember.role,
    username,
    displayName,
    avatarUrl,
    status,
    resolved: Boolean(username || displayName || avatarUrl)
  };
}

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.txt': 'text/plain; charset=utf-8'
};

function sendFile(filePath, res) {
  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        fs.readFile(path.join(root, 'index.html'), (indexErr, indexContent) => {
          if (indexErr) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('Not found');
            return;
          }
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(indexContent);
        });
        return;
      }
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Server error');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  });
}

async function getDiscordServerData() {
  const response = await fetch(`https://discord.com/api/v10/invites/${inviteCode}?with_counts=true&with_expiration=true`);

  if (!response.ok) {
    throw new Error(`Discord API responded with ${response.status}`);
  }

  const inviteData = await response.json();
  const guild = inviteData.guild || {};
  const widgetMembers = await getWidgetMembers(guild.id || serverId);
  const vanityInviteLink = guild.vanity_url_code ? `https://discord.gg/${guild.vanity_url_code}` : null;
  const resolvedInviteLink = permanentInviteUrl || vanityInviteLink || inviteLink;

  const enrichedStaffMembers = await Promise.all(
    staffMembers.map((staffMember) => resolveStaffMember(staffMember, guild.id || serverId, widgetMembers))
  );

  const iconUrl = guild.id && guild.icon
    ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=256`
    : null;

  return {
    inviteLink: resolvedInviteLink,
    serverId: guild.id || serverId,
    serverName: guild.name || 'TradeUp',
    iconUrl,
    memberCount: inviteData.approximate_member_count ?? null,
    onlineCount: inviteData.approximate_presence_count ?? null,
    staffMembers: enrichedStaffMembers,
    supportsFullLookup: Boolean(discordBotToken),
    supportsLivePresence: Boolean(discordClientReady),
    botOnline: Boolean(discordClientReady),
    botTag: discordClientTag,
    botLastError: discordLastError
  };
}

const server = http.createServer((req, res) => {
  const requestPath = decodeURIComponent((req.url || '/').split('?')[0]);
  const requestUrl = new URL(req.url || '/', getBaseUrl(req));

  if (requestPath === '/auth/discord') {
    const desiredRedirect = requestUrl.searchParams.get('redirect') || '/bot-status';
    const safeRedirect = desiredRedirect.startsWith('/') ? desiredRedirect : '/bot-status';
    const oauthState = crypto.randomBytes(20).toString('hex');
    oauthStates.set(oauthState, {
      redirect: safeRedirect,
      expiresAt: Date.now() + (1000 * 60 * 10)
    });

    const redirectUri = getRedirectUri(req);
    const authUrl = `https://discord.com/oauth2/authorize?${new URLSearchParams({
      client_id: discordClientId,
      response_type: 'code',
      scope: 'identify',
      redirect_uri: redirectUri,
      prompt: 'none',
      state: oauthState
    }).toString()}`;

    res.writeHead(302, { Location: authUrl });
    res.end();
    return;
  }

  if (requestPath === '/auth/discord/callback') {
    const code = requestUrl.searchParams.get('code');
    const state = requestUrl.searchParams.get('state');
    const stateRecord = state ? oauthStates.get(state) : null;

    if (!code || !stateRecord || stateRecord.expiresAt < Date.now()) {
      if (state) {
        oauthStates.delete(state);
      }
      res.writeHead(302, { Location: '/bot-status?error=oauth-state' });
      res.end();
      return;
    }

    oauthStates.delete(state);
    exchangeDiscordCodeForUser(code, getRedirectUri(req))
      .then((discordUser) => {
        const userId = String(discordUser.id || '');
        if (!allowedUserIds.has(userId)) {
          res.writeHead(302, {
            Location: '/bot-status?error=not-allowed',
            'Set-Cookie': clearSessionCookie(req)
          });
          res.end();
          return;
        }

        const sessionId = createSession({
          id: userId,
          username: discordUser.username || null,
          globalName: discordUser.global_name || null,
          avatar: discordUser.avatar || null
        });

        res.writeHead(302, {
          Location: stateRecord.redirect,
          'Set-Cookie': getSessionCookie(sessionId, req)
        });
        res.end();
      })
      .catch(() => {
        res.writeHead(302, {
          Location: '/bot-status?error=oauth-failed',
          'Set-Cookie': clearSessionCookie(req)
        });
        res.end();
      });
    return;
  }

  if (requestPath === '/auth/logout') {
    res.writeHead(302, {
      Location: '/bot-status',
      'Set-Cookie': clearSessionCookie(req)
    });
    res.end();
    return;
  }

  if (requestPath === '/api/auth/me') {
    const user = getSessionUser(req);
    const userId = user?.id ? String(user.id) : null;
    const authorized = Boolean(userId && allowedUserIds.has(userId));

    sendJson(res, {
      authenticated: Boolean(user),
      authorized,
      user: user || null,
      message: authorized
        ? null
        : 'You are not a valid id please contact a Developer to be added to the system'
    });
    return;
  }

  if (requestPath === '/api/oauth-debug') {
    const redirectUri = getRedirectUri(req);
    sendJson(res, {
      redirectUri,
      clientIdConfigured: Boolean(discordClientId),
      clientSecretConfigured: Boolean(discordClientSecret),
      configuredRedirectUri,
      publicBaseUrl
    });
    return;
  }

  if (requestPath === '/api/discord-server') {
    getDiscordServerData()
      .then((data) => {
        sendJson(res, data);
      })
      .catch(() => {
        sendJson(res, {
          inviteLink: permanentInviteUrl || inviteLink,
          serverId,
          serverName: 'TradeUp',
          iconUrl: null,
          memberCount: null,
          onlineCount: null,
          staffMembers: staffMembers.map((staffMember) => ({
            ...staffMember,
            username: null,
            displayName: null,
            avatarUrl: null,
            status: 'offline',
            resolved: false
          })),
          supportsFullLookup: Boolean(discordBotToken),
          supportsLivePresence: Boolean(discordClientReady),
          botOnline: Boolean(discordClientReady),
          botTag: discordClientTag,
          botLastError: discordLastError
        });
      });
    return;
  }

  if (requestPath === '/api/bot-health') {
    sendJson(res, {
      botOnline: Boolean(discordClientReady),
      botTag: discordClientTag,
      tokenConfigured: Boolean(discordBotToken),
      lastError: discordLastError
    });
    return;
  }

  const safePath = path.normalize(requestPath).replace(/^([.][.][\\/])+/, '');

  let filePath = path.join(root, safePath);

  if (safePath === '/' || safePath === '') {
    filePath = path.join(root, 'index.html');
  }

  fs.stat(filePath, (error, stats) => {
    if (!error && stats.isDirectory()) {
      sendFile(path.join(filePath, 'index.html'), res);
      return;
    }

    sendFile(filePath, res);
  });
});

startDiscordBotClient().finally(() => {
  server.listen(port, () => {
    console.log(`TradeUp React site running on port ${port}`);
  });
});
