require('dotenv').config()

const { startBot, startPubSub } = require('./bot')
const { handleSetupBot, handleSetupPubSub } = require('./setup')

const { program } = require('commander')

program
  .command('setup-pubsub')
  .action( handleSetupPubSub )

program
  .command('setup-bot')
  .action( handleSetupBot )

program
  .command('start')
  .action( () => {
    startBot()
    startPubSub()
  })

program.parse(process.argv)