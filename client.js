'use strict'

// KEEP this file in sync with browser_client.js
//
// or figure out how to factor them together, given packaging for the browser...

const webgram = require('webgram')
const debug = require('debug')('webgram_sessions_client')
const myStorage = require('./storage')

async function attach (client, options = {}) {
  const localStorage = myStorage(options)

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
      localStorage.setItem(client.address, JSON.stringify(sessionData))
    }
    debug('session active, okay to do stuff in session')
    client.emit('$session-active')
  })

  if (!client.sessionData) {
    debug('looking for saved session data')
    client.sessionData = JSON.parse(localStorage.getItem(client.address))
  }

  // use sendDuringSetup if we have it
  const send = (client.sendDuringSetup
                ? client.sendDuringSetup.bind(client)
                : client.send.bind(client))

  if (client.sessionData) {
    debug('trying to resume session using %O', client.sessionData)
    send('session-resume',
         client.sessionData.id,
         client.sessionData.secret)
  } else {
    send('session-create')
  }
}

class Client extends webgram.Client {
  constructor (...args) {
    super(...args)
    this.sessionBuffer = []
    this.inSession = false
    this.on('$session-active', () => {
      debug('caught $session-active, sending old stuff')
      for (let item of this.sessionBuffer) {
        debug('sending queued message', item)
        this.socket.send(item)
      }
      this.inSession = true
      debug('sending normally now')
    })
    attach(this, this)
  }

  // this is how we escape the buffering for our setup messages
  sendDuringSetup (...args) {
    super.send(...args)
  }

  // buffer everything until the session is started
  send (...args) {
    if (this.inSession) {
      super.send(...args)
    } else {
      debug('buffering until session is ready %o', args)
      this.sessionBuffer.push(JSON.stringify(args))
    }
  }
}

module.exports.attach = attach
module.exports.Client = Client

// for when this gets substited for index.js by browserify
module.exports.client = { attach, Client }
