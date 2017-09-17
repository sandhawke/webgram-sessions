'use strict'

const debug = require('debug')('webgram-sessions-client')

async function attach (client, options = {}) {
  client.on('session-error', msg => {
    throw Error('login failed: ' + msg)
  })

  client.on('session-ok', async (id, secret) => {
    if (secret) {
      const sessionData = {
        address: client.address,
        id,
        secret,
        whenAdded: new Date()
      }
      client.sessionData = sessionData
      window.localStorage.setItem(client.address, JSON.stringify(sessionData))
    }
    client.emit('$session-active')
  })

  if (!client.sessionData) {
    debug('looking for saved session data')
    client.sessionData = window.localStorage.getItem(client.address)
  }

  if (client.sessionData) {
    debug('trying to resume session', client.sessionData.id)
    client.send('session-resume',
                client.sessionData.id,
                client.sessionData.secret)
  } else {
    client.send('session-create')
  }
}

module.exports.attach = attach

// for when this gets substited for index.js by browserify
module.exports.client = { attach }
