'use strict'

const test = require('tape')
const webgram = require('webgram')
const logins = require('.')

test(async (t) => {
  t.plan(1)
  const s = new webgram.Server()
  logins.attach(s)
  await s.start() // need to wait for address

  s.on('ping', (conn, ...args) => {
    conn.send('pong', ...args)
  })

  // console.log('address', s.address)
  const c = new webgram.Client(s.address)
  logins.attach(c)
  c.on('pong', (text) => {
    console.log('test response to c1:', text)
    t.equal(text, 'hello')
    c.close()
    s.stop().then(() => {
      t.end()
    })
  })
  // c.send('$ping', 'hello')  // this is probably before connected, so queued
  c.on('$login', u => {
    console.log('logged in as', u)
    c.send('ping', 'hello')
  })
})
