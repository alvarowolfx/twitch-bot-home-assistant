
const fetch = require('node-fetch')
const open = require('open');
const fastify = require('fastify')({
  logger: false,
})
const fs = require('fs-extra')

const config = require('./config')

const botScope = 'chat:read+chat:edit'
const pubSubScope = 'channel:read:redemptions+channel_subscriptions+bits:read'
const redirectURI = `http://localhost:${config.port}`
const twitchIdApi = 'https://id.twitch.tv/oauth2'


async function getOAuthInfo(code) {
  const url = `${twitchIdApi}/token?client_id=${config.clientId}&client_secret=${config.clientSecret}&code=${code}&redirect_uri=${redirectURI}&grant_type=authorization_code`

  const res = await fetch(url, {
    method: 'post',
  })

  const json = await res.json()
  return {
    accessToken: json.access_token,
    expiresIn: json.expires_in,
    refreshToken: json.refresh_token,
    scope: json.scope,
    tokenType: json.token_type,
  }
}


async function saveDataAndExit(code, filename) {
  const info = await getOAuthInfo(code)
  await fs.writeFile(filename, JSON.stringify(info, null, 4), 'UTF-8')
  setTimeout(() => {
    process.exit(0)
  }, 1000)
}

async function saveBotData(code) {
  saveDataAndExit(code, config.botConfigFile)
}

async function savePubSubData(code) {
  saveDataAndExit(code, config.pubsubConfigFile)
}

function setupCallbackServer() {
  fastify.get('/', async (request, reply) => {
    reply.type('application/json').code(200)
    try {
      const { code } = request.query
      const { scope } = request.query
      const strScope = scope.split(' ').join('+')
      if (strScope === botScope) {
        await saveBotData(code)
        reply.type('application/json').code(200)
        return { message: 'account linked' }
      }

      if (strScope === pubSubScope) {
        await savePubSubData(code)
        reply.type('application/json').code(200)
        return { message: 'account linked' }
      }

      reply.type('application/json').code(400)
      return { message: 'Bad request' }
    } catch (err) {
      reply.type('application/json').code(500)
      return { message: err.message }
    }
  })

  fastify.listen(config.port, (err, address) => {
    if (err) throw err
    fastify.log.info(`server listening on ${address}`)
  })
}

async function handleSetupBot() {
  setupCallbackServer()
  const url = `${twitchIdApi}/authorize?client_id=${config.clientId}&redirect_uri=${redirectURI}&response_type=code&scope=${botScope}`
  await open(url)
  console.log('Login into Twitch.tv and authorize the application.')
  console.log(`If browser doesn't open, go to this link on any browser : ${url}`)
}

async function handleSetupPubSub() {
  setupCallbackServer()
  const url = `${twitchIdApi}/authorize?client_id=${config.clientId}&redirect_uri=${redirectURI}&response_type=code&scope=${pubSubScope}`
  await open(url)
  console.log('Login into Twitch.tv and authorize the application.')
  console.log(`If browser doesn't open, go to this link on any browser : ${url}`)
}

module.exports = {
  handleSetupBot,
  handleSetupPubSub,
}
