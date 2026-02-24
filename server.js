const http = require('http');
const fs = require('fs');
const path = require('path');

const port = process.env.PORT || 3000;
const root = path.join(__dirname, 'dist');
const inviteCode = 'rM43kyut';
const inviteLink = `https://discord.gg/${inviteCode}`;
const serverId = '1470184067776647284';
const permanentInviteUrl = (process.env.PERMANENT_INVITE_URL || '').trim();
const discordBotToken = (process.env.DISCORD_BOT_TOKEN || '').trim();

const staffMembers = [
  { userId: '1057806013639704676', role: 'Owner' },
  { userId: '1123305643458183228', role: 'Owner' },
  { userId: '1435310225010987088', role: 'Developer' }
];

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
  const widgetMember = widgetMembers.find((member) => member.id === staffMember.userId);
  const userFromApi = await discordApiGet(`https://discord.com/api/v10/users/${staffMember.userId}`);
  const guildMemberFromApi = await discordApiGet(`https://discord.com/api/v10/guilds/${guildId}/members/${staffMember.userId}`);

  const username = userFromApi?.username || widgetMember?.username || null;
  const displayName = guildMemberFromApi?.nick
    || userFromApi?.global_name
    || widgetMember?.global_name
    || username;
  const avatarUrl = getUserAvatarUrl(userFromApi) || widgetMember?.avatar_url || null;
  const status = widgetMember?.status || 'offline';

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
    supportsFullLookup: Boolean(discordBotToken)
  };
}

const server = http.createServer((req, res) => {
  const requestPath = decodeURIComponent((req.url || '/').split('?')[0]);

  if (requestPath === '/api/discord-server') {
    getDiscordServerData()
      .then((data) => {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(data));
      })
      .catch(() => {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
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
          supportsFullLookup: Boolean(discordBotToken)
        }));
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

server.listen(port, () => {
  console.log(`TradeUp React site running on port ${port}`);
});
