const ChatClient = require('twitch-chat-client').default
const { BasicPubSubClient } = require('twitch-pubsub-client')

const config = require('./config')

async function startBot(){
  const twitchClient = await config.getTwitchClientFromFile(config.botConfigFile)
  const chatClient = await ChatClient.forTwitchClient(twitchClient, {
    channels : [config.channelId],
  })
  await chatClient.connect()

  chatClient.say(config.channelId, 'Ready to work!')

  chatClient.onPrivmsg( (channel, user, msg) => {
    if (msg === '!dice' ) {
      const diceRoll = Math.floor(Math.random() * 6) + 1;
      chatClient.say(channel, `@${user} rolled a ${diceRoll}`)
    }
  })
}

async function startPubSub(){
  const filename = config.pubsubConfigFile
  const tokenData = await config.getTokenData(filename)
  const twitchClient = await config.getTwitchClientFromFile(filename)

  const user = await twitchClient.helix.users.getUserByName(config.channelId)
  console.log('user', user.id)
  const channel = await twitchClient.kraken.channels.getChannel(user)
  console.log('channel', channel.id)

  const pubSubClient = new BasicPubSubClient()
  await pubSubClient.connect()
  await pubSubClient.listen(`channel-points-channel-v1.${channel.id}`, tokenData.accessToken , 'channel:read:redemptions')

  pubSubClient.onPong( () => {
    console.log('Pong')
  })

  pubSubClient.onConnect( async () => {
    console.log('Connected')
  })

  pubSubClient.onMessage( (topic, message) => {
    console.log(topic,message)
  })
}

module.exports = {
  startBot,
  startPubSub
}