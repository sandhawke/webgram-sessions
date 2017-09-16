'use strict'

const crypto = require('crypto')
const level = require('level')
const debug = require('debug')('webgram-logins-server')
const webgram = require('webgram')

function attach (server, options = {}) {
  const db = (options.db ||
              level(options.path || 'webgram-logins-secrets', {
                valueEncoding: 'json'
              }))

  let nextUID = 0
  const genUID = async () => {
    if (!nextUID) {
      try {
        nextUID = await get(db, 'nextUID')
      } catch (e) {
        if (e.notFound) {
          nextUID = 1
        } else {
          throw e
        }
      }
    }
    const uid = nextUID
    nextUID++
    await put(db, 'nextUID', nextUID)
    return uid
  }

  class Connection extends webgram.Server.Connection {
  // write conn.userData to disk, which you should probably do after
  // you modify it for some reason.
    async save () {
      debug('SAVING', this.userData._uid, JSON.stringify(this.userData, null, 2))
      await put(db, this.userData._uid, this.userData)
    }

    async createLogin (auth) {
      const _uid = await genUID()
      const _secret = crypto.randomBytes(64).toString('base64')
      const _firstVisitTime = new Date()
      const _latestVisitTime = _firstVisitTime
      const userData = {
        _uid,
        _secret,
        _firstVisitTime,
        _latestVisitTime
      }

    // carry through some properties?
      if (auth._displayName) userData._displayName = auth._displayName

      this.userData = userData
      await this.save()
    }

    async login (auth) {
      let userData
      try {
        userData = await get(db, auth._uid)
      } catch (err) {
        if (err.notFound) return 'unknown uid'
        console.error('error in looking for userdata', err)
        return 'internal error'
      }

    // todo: add some crypto
      if (userData.secret === auth.secret) {
        userData._previousVisitTime = userData._latestVisitTime
        userData._latestVisitTime = new Date()
        this.userData = userData
        await this.save()
        return null // success
      }
      return 'incorrect secret'
    }
  }

  server.ConnectionClass = Connection

  server.on('please-log-me-in', async (conn, auth) => {
    if (auth.create) {
      delete auth.create
      await conn.createLogin(auth)
      conn.send('you-are-logged-in', conn.userData)
    } else {
      const fail = await conn.login(auth)
      if (fail) {
        conn.send('login-failed', fail)
        return
      }
      conn.send('you-are-logged-in', conn.userData)
    }
    server.emit('$login', conn)
    conn.emit('$login')
    debug('client logged in')
  })
}

// alas, right now the Promises support in leveldb isn't released

function get (db, key) {
  return new Promise((resolve, reject) => {
    debug('doing get', key)
    db.get(key, (err, data) => {
      if (err) reject(err)
      resolve(data)
    })
  })
}

function put (db, key, value) {
  return new Promise((resolve, reject) => {
    db.put(key, value, (err) => {
      if (err) reject(err)
      resolve()
    })
  })
}

module.exports.attach = attach
