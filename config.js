const TwitchClient = require('twitch').default
const fs = require('fs-extra')

const config = {
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,

  /* User config */
  channelId: process.env.CHANNEL_USERNAME,
  changeColorRewardId: process.env.CHANGE_COLOR_REWARD_ID,
  ledStripEntityId: 'light.outer_light',
  ledBulbId: 'light.office_table',

  /* Files */
  botConfigFile: process.env.BOT_CONFIG_FILE || 'bot-tokens.json',
  pubsubConfigFile: process.env.PUBSUB_CONFIG_FILE || 'pubsub-tokens.json',

  /* Hass */
  hassHost: process.env.HASS_HOST,
  hassToken: process.env.HASS_TOKEN,

  /* Callback server */
  port: process.env.PORT || 8080,
}

async function getTokenData(filename) {
  return JSON.parse(await fs.readFile(filename))
}

async function getTwitchClientFromFile(filename) {
  const tokenData = await getTokenData(filename)
  const twitchClient = TwitchClient
    .withCredentials(
      config.clientId,
      tokenData.accessToken,
      undefined,
      {
        clientSecret: config.clientSecret,
        refreshToken: tokenData.refreshToken,
        expiry: tokenData.expiryTimestamp === null ? null : new Date(tokenData.expiryTimestamp),
        onRefresh: async ({ accessToken, refreshToken, expiryDate }) => {
          const newTokenData = {
            accessToken,
            refreshToken,
            expiryTimestamp: expiryDate === null ? null : expiryDate.getTime(),
          }
          await fs.writeFile(filename, JSON.stringify(newTokenData, null, 4), 'UTF-8')
        },
      },
    )
  return twitchClient
}

module.exports = {
  ...config,
  getTokenData,
  getTwitchClientFromFile,
}
