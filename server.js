'use strict'

const crypto = require('crypto')
const level = require('level')
const alevel = require('./asynclevel')
const debug = require('debug')('webgram_sessions_server')
const webgram = require('webgram')

function attach (server, options = {}) {
  const sessionDataBySessionID = new Map()

  const db = (options.db ||
              level(options.path || 'webgram-server-secrets', {
                valueEncoding: 'json'
              }))

  let nextSessionID = null
  const dispenseSessionID = async () => {
    debug('dispensing session id')
    if (!nextSessionID) {
      try {
        const tmp = await alevel.get(db, 'nextSessionID')
        if (nextSessionID === null) {
          debug('we were the first to read it')
          nextSessionID = tmp
        } else {
          debug('someone else read it before us')
        }
      } catch (e) {
        if (e.notFound) {
          debug('nothing in database')
          // while we were waiting, someone else might have set it
          if (nextSessionID === null) {
            debug('an its still null')
            nextSessionID = 1
          }
        } else {
          throw e
        }
      }
    }
    const sessionID = nextSessionID
    nextSessionID++
    debug('now we have set nextSessionID =', nextSessionID)
    // what if these end up occuring out of order...  is that possible?
    // If we queue up many of these, maybe the highest wont be the one
    // written.  Maybe best to use writeFileSync, not in async code...?
    await alevel.put(db, 'nextSessionID', nextSessionID)
    debug('... and saved it, ', sessionID + 1, nextSessionID)
    return sessionID
  }

  class Connection extends webgram.Server.Connection {
    // write conn.sessionData to disk, which you should probably do after
    // you modify it for some reason.
    async save () {
      debug('saving %n %j', this.sessionData._sessionID, this.sessionData)
      await alevel.put(db, this.sessionData._sessionID, this.sessionData)
      this.emit('$save')
    }
  }

  server.ConnectionClass = Connection

  server.on('session-create', async (conn, _fromClient) => {
    const _sessionID = await dispenseSessionID()
    const _secret = (await randomBytes(64)).toString('base64')
    const _firstVisitTime = new Date()
    const _latestVisitTime = _firstVisitTime
    const sessionData = {
      _sessionID,
      _secret,
      _firstVisitTime,
      _latestVisitTime,
      _fromClient
    }

    await conclude(conn, sessionData, 'create')
    conn.send('session-ok', _sessionID, _secret)
  })

  server.on('session-resume', async (conn, _sessionID, _secret) => {
    debug('session-resume', _sessionID, _secret)
    let sessionData

    // memory cache of sessionData, but also needed to have structure
    // sharing in case the same sessionID logs in to two connections at
    // once.  With this, they'll share the same sessionData object.
    // When they .save we can notify the other connections.
    sessionData = sessionDataBySessionID.get(_sessionID)
    debug('cached sessionData', sessionData)
    if (!sessionData) {
      try {
        sessionData = await alevel.get(db, _sessionID)
        debug('loaded sessionData %o', sessionData)
      } catch (err) {
        if (err.notFound) {
          debug('no match for id', _sessionID)
          conn.send('session-error', 'incorrect-id')
        } else {
          console.error('error in looking for userdata', err)
          conn.send('session-error', 'internal-error')
        }
        return
      }
    }

    // todo: add some crypto

    if (sessionData._secret !== _secret) {
      debug('mismatch', sessionData.secret, _secret)
      conn.send('session-error', 'incorrect-secret')
      return
    }

    sessionData._previousVisitTime = sessionData._latestVisitTime
    sessionData._latestVisitTime = new Date()

    await conclude(conn, sessionData)
    conn.send('session-ok', _sessionID)
  })

  async function conclude (conn, sessionData) {
    const id = sessionData._sessionID
    conn.sessionData = sessionData
    sessionDataBySessionID.set(id, sessionData)
    await conn.save()
    server.emit('$session-active', conn)
    conn.emit('$session-active')
    debug('session-create complete')
  }
}

async function randomBytes (count) {
  return new Promise((resolve, reject) => {
    crypto.randomBytes(64, (err, buf) => {
      if (err) reject(err)
      resolve(buf)
    })
  })
}

module.exports.attach = attach
