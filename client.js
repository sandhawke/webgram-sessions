'use strict'

const webgram = require('webgram')
const level = require('level')
const alevel = require('./asynclevel')
const debug = require('debug')('webgram-sessions-client')

async function attach (client, options = {}) {
  const db = (options.db ||
              level(options.path || 'webgram-client-secrets', {
                valueEncoding: 'json'
              }))

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
      // make sure it's saved before we tell the client?
      client.sessionData = sessionData
      await alevel.put(db, client.address, sessionData)
    }
    debug('session active, okay to do stuff in session')
    client.emit('$session-active')
  })

  if (!client.sessionData) {
    debug('looking for saved session data')
    try {
      client.sessionData = await alevel.get(db, client.address)
      debug('got it')
    } catch (e) {
      if (e.notFound) {
        debug('no saved session data in database for', client.address)
        // fall through
      } else {
        throw e
      }
    }
  }

  // use sendDuringSetup if we have it
  const send = (client.sendDuringSetup
                ? client.sendDuringSetup.bind(client)
                : client.send.bind(client))

  if (client.sessionData) {
    debug('trying to resume session', client.sessionData.id)
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
    attach(this)
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
      debug('buffering until session is ready', args)
      this.sessionBuffer.push(JSON.stringify(args))
    }
  }
}

module.exports.attach = attach
module.exports.Client = Client
