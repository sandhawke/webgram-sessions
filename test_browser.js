'use strict'

const test = require('tape')
const browserify = require('browserify')
const webgram = require('.')
const opn = require('opn')
// const teen = require('teen_process')

test(async (t) => {
  t.plan(1)

  const b = browserify('browser_test_1.js')

  const s = new webgram.Server()

  s.app.get('/', (req, res) => {
    res.send(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Testing</title>
<script type="text/javascript" src="/bundle.js" async></script>
</head>
<body>
<p>js not working?</p>
</body>`)
  })

  s.app.get('/bundle.js', (req, res) => {
    b.bundle().pipe(res)
  })

  await s.start() // need to wait for address

  s.on('equal', (conn, a, b) => {
    console.log('called equal', a, b)
    t.equal(a, b)
  })

  // let proc = new teen.SubProcess('firefox', ['--no-remote', '-P', 'plantohelp', s.siteURL])

  s.on('end', async () => {
    // await proc.stop(9)
    // console.log('firefox stopped')
    console.log('stopping server')
    await s.stop()
    console.log('server report stopped')
    t.end()
  })

  // proc.start()
  opn(s.siteURL, {app: 'google-chrome'})
})
