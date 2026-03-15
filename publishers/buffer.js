const axios = require('axios');
const BUFFER_API = 'https://api.bufferapp.com/1';

async function getBufferChannels(accessToken) {
  const response = await axios.get(`${BUFFER_API}/profiles.json`, {
    params: { access_token: accessToken }
  });
  return response.data.map(p => ({ id: p.id, name: p.formatted_username, platform: p.service }));
}

async function publishNowWithBuffer(accessToken, channelId, content) {
  const params = new URLSearchParams();
  params.append('access_token', accessToken);
  params.append('profile_ids[]', channelId);
  params.append('text', content);
  params.append('now', 'true');
  const response = await axios.post(`${BUFFER_API}/updates/create.json`, params);
  if (!response.data.success) throw new Error(response.data.message || 'Echec Buffer');
  return response.data.updates?.[0];
}

module.exports = { getBufferChannels, publishNowWithBuffer };
