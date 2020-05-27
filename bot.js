const ChatClient = require('twitch-chat-client').default
const { BasicPubSubClient } = require('twitch-pubsub-client')
const { setColor, flashColors } = require('./hassio')
const config = require('./config')

const { changeColorRewardId, ledStripEntityId, ledBulbId } = config

/**
 * @type ChatClient
 */
let chatClient
let moderatorsMap = {}


function isMod(user) {
  return !!moderatorsMap[user]
}

function isOwner(user) {
  return user === config.channelId
}

async function startBot() {
  const twitchClient = await config.getTwitchClientFromFile(config.botConfigFile)
  chatClient = await ChatClient.forTwitchClient(twitchClient, {
    channels: [config.channelId],
  })
  await chatClient.connect()

  // chatClient.say(config.channelId, 'Pronto pra mais uma live!')

  chatClient.onPrivmsg(async (channel, user, msg) => {
    console.log(channel, user, msg)
    if (msg === '!dice') {
      const diceRoll = Math.floor(Math.random() * 6) + 1
      chatClient.say(channel, `@${user} rolled a ${diceRoll}`)
    }

    if (msg.startsWith('!color ')) {
      if (isOwner(user) || isMod(user)) {
        const [, color] = msg.split(' ')
        await setColor(ledStripEntityId, color)
      } else {
        chatClient.say(channel, `Só o ${config.channelId} e moderadores podem usar esse comando.`)
      }
    }

    if (user === 'streamlabs' && msg.startsWith('Obrigado pelo follow')) {
      await Promise.all([
        flashColors(ledStripEntityId, ['gold', 'purple']),
        flashColors(ledBulbId, ['gold', 'purple'], 2, 500),
      ])
    }

    if (msg === '!newfollower' && isOwner(user)) {
      await Promise.all([
        flashColors(ledStripEntityId, ['hotpink', 'aliceblue'], 20, 250),
        flashColors(ledBulbId, ['hotpink', 'aliceblue'], 2, 500),
      ])
    }
  })
}

async function startPubSub() {
  const filename = config.pubsubConfigFile
  const tokenData = await config.getTokenData(filename)
  const twitchClient = await config.getTwitchClientFromFile(filename)

  const channelUser = await twitchClient.helix.users.getUserByName(config.channelId)
  console.log('user', channelUser.id, channelUser.type)
  const channel = await twitchClient.kraken.channels.getChannel(channelUser)
  console.log('channel followers', channel.followers)

  const moderators = await twitchClient.helix.moderation.getModerators(channel)
  moderatorsMap = moderators.data.reduce((acc, mod) => {
    acc[mod.userName] = true
    acc[mod.userId] = true
    return acc
  }, {})

  const pubSubClient = new BasicPubSubClient()
  await pubSubClient.connect()
  await pubSubClient.listen(`channel-points-channel-v1.${channel.id}`, tokenData.accessToken, 'channel:read:redemptions')

  const subscriptionTopic = `channel-subscribe-events-v1.${channel.id}`
  await pubSubClient.listen(subscriptionTopic, tokenData.accessToken, 'channel_subscriptions')

  /* pubSubClient.onPong( () => {
    console.log('Pong')
  }) */

  pubSubClient.onConnect(async () => {
    console.log('Connected')
  })


  pubSubClient.onMessage(async (topic, message) => {
    const { type, data } = message

    console.log(JSON.stringify(message))
    if (type === 'reward-redeemed') {
      const { redemption } = data
      const { reward, user, user_input: userInput } = redemption

      if (reward.id === changeColorRewardId) {
        chatClient.say(config.channelId,
          `@${user.display_name} pediu pra trocar fita de led para "${userInput}".`)
        try {
          await setColor(ledStripEntityId, userInput)
          chatClient.say(config.channelId,
            `@${user.display_name} mudamos a cor da fita de led, obrigado por interagir com a live.`)
        } catch (err) {
          console.log('Erro mudando cor', err)
          chatClient.say(config.channelId,
            `@${user.display_name} Você mandou uma cor inválida, as cores devem seguir o mesmo formato usado pelo CSS.`)
        }
      }
    }

    if (subscriptionTopic === topic) {
      await Promise.all([
        flashColors(ledStripEntityId, ['hotpink', 'aliceblue'], 20, 250),
        flashColors(ledBulbId, ['hotpink', 'aliceblue'], 2, 500),
      ])
    }
  })
}

module.exports = {
  startBot,
  startPubSub,
}
