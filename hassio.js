const fetch = require('node-fetch')
const Color = require('color')
const config = require('./config')

const { hassToken, hassHost } = config

const sleep = (ms) => new Promise((resolve) => {
  setTimeout(resolve, ms)
})

async function getColor(entityId) {
  const url = `${hassHost}/api/states/${entityId}`
  const res = await fetch(url, {
    method: 'get',
    headers: {
      Authorization: `Bearer ${hassToken}`,
    },
  })

  const json = await res.json()
  const { rgb_color: rgbColor } = json.attributes
  const color = Color.rgb(rgbColor)
  return color.hex()
}

async function setColor(entityId, color) {
  let parsedColor
  try {
    parsedColor = Color(color)
  } catch (err) {
    throw new Error('Invalid color')
  }

  const url = `${hassHost}/api/services/light/turn_on`
  const body = {
    entity_id: entityId,
    rgb_color: parsedColor.rgb().array(),
    brightness: 255,
  }

  const res = await fetch(url, {
    method: 'post',
    body: JSON.stringify(body),
    headers: {
      Authorization: `Bearer ${hassToken}`,
    },
  })

  const json = await res.json()
  return json
}

async function flashColors(entityId, colors, times = 6, interval = 300) {
  const oldColor = await getColor(entityId)
  const [oddColor, evenColor] = colors
  const arr = new Array(times).fill(0).map((_, i) => i)

  // eslint-disable-next-line no-restricted-syntax
  for (const i of arr) {
    // eslint-disable-next-line no-await-in-loop
    await setColor(entityId, i % 2 === 0 ? oddColor : evenColor)
    // eslint-disable-next-line no-await-in-loop
    await sleep(interval)
  }

  await setColor(entityId, oldColor)
}

module.exports = {
  setColor,
  getColor,
  flashColors,
}
