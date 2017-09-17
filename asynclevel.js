'use strict'

// alas, right now the Promises support in leveldb isn't released

function get (db, key) {
  return new Promise((resolve, reject) => {
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

module.exports.get = get
module.exports.put = put
