'use strict'

const test = require('tape')
const webgram = require('webgram')
const sessions = require('.')

test(async (t) => {
  t.plan(1)

  // need fixed port for session restore
  const s = new webgram.Server({port: 9891})

  sessions.server.hook(s)
  await s.start() // need to wait for address

  s.on('ping', (conn, ...args) => {
    conn.send('pong', ...args)
  })

  // console.log('address', s.address)
  const c = new webgram.Client(s.address)
  sessions.client.hook(c)

  c.on('pong', (text) => {
    console.log('test response to c1:', text)
    t.equal(text, 'hello')
    c.close()
    s.stop().then(() => {
      t.end()
    })
  })
  // c.send('$ping', 'hello')  // this is probably before connected, so queued
  c.on('$session-active', () => {
    console.log('session data: ', c.sessionData)
    c.send('ping', 'hello')
  })
})
