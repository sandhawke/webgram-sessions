
Add securely-resumable-sessions to webgram, using secrets kept in
localStorage (or pseudo localStorage for node clients).  Basically,
makes it easy for server code to remember which client it's talking
to, like cookies.

In our model, a webgram connection, when in-session, has exactly one
sessionID, which is a sequence number assigned by the server and used
to maintain persistent state in a leveldb.  That sessionID and the
associated data is available server-side as conn.sessionData. After
changing it, call conn.save() and it'll be there for future
connections and future runs of the server.  Multiple connections from
the same browser will end up sharing one sessionData object.

Clients are free to make different connections using different pairs
of (sessionID, secret).  This can be useful for switching user logins
without re-authenticating at the user-level.

See examples/plus_one

On the client if you're just using one identity:

```js
const webgrams = require('webgram')
const sessions = require('webgram-sessions')

const c = new webgram.Client('ws://localhost:5678')
sessions.hook(c)   // this does what it needs to

// everything else is the same
// ...
```

The server isn't bad: just attach the sessions plugin and ignore
connections until they trigger $session-active:

```js
const webgram = require('webgram')
const sessions = require('webgram-sessions')

const server = new webgram.Server({port: 5678})
sessions.attach(server)
server.on('$session-active', conn => {    // instead of '$opened'

  // read and write conn.sessionData including .id
  conn.save()   // after modifying

})

```

Hopefully this wont break when we add TLS, reconnecting, and
authstreams-style cbor + encryption.

Note that conn.sessionData is the same shared object when multiple
connections are made with the same sessionID, as will happen if you
connect in multiple windows of the same browser.  conn.save() emits
$save which can be used to be notified about changes.

Some fields in sessionData are maintainted by the system:

* _sessionID

* _firstVistTime, _previousVisitTime, _latestVisitTime

* _fromClient points to an object passed by client during session
creation

## Credits and Disclaimer

This material is based upon work supported by the National Science
Foundation under Grant No. 1313789.  Any opinions, findings, and
conclusions or recommendations expressed in this material are those of
the author(s) and do not necessarily reflect the views of the National
Science Foundation.
