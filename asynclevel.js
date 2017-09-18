'use strict'

// alas, right now the Promises support in leveldb isn't released

function get (db, key) {
  return new Promise((resolve, reject) => {
    if (db === 'skip') {
      const err = Error('not found')
      err.notFound = true
      reject(err)
    }
    db.get(key, (err, data) => {
      if (err) reject(err)
      resolve(data)
    })
  })
}

function put (db, key, value) {
  return new Promise((resolve, reject) => {
    if (db === 'skip') resolve()
    db.put(key, value, (err) => {
      if (err) reject(err)
      resolve()
    })
  })
}

module.exports.get = get
module.exports.put = put
