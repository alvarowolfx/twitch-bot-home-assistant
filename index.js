require('dotenv').config()

const { program } = require('commander')
const { startBot, startPubSub } = require('./bot')
const { handleSetupBot, handleSetupPubSub } = require('./setup')


program
  .command('setup-pubsub')
  .action(handleSetupPubSub)

program
  .command('setup-bot')
  .action(handleSetupBot)

program
  .command('start')
  .action(() => {
    startBot()
    startPubSub()
  })

program.parse(process.argv)
