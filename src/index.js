/* global Y */
'use strict'

const log = require('debug')('y-ipfs-connector')
const EventEmitter = require('events')
const Room = require('ipfs-pubsub-room')
const encode = require('./encode')
const decode = require('./decode')

function extend (Y) {
  class YIpfsConnector extends Y.AbstractConnector {
    constructor (y, options) {
      if (options === undefined) {
        throw new Error('Options must not be undefined!')
      }
      if (options.room == null) {
        throw new Error('You must define a room name!')
      }
      if (!options.ipfs) {
        throw new Error('You must define a started IPFS object inside options')
      }
      options.role = 'master'
      super(y, options)

      this.ipfs = options.ipfs

      const topic = this.ipfsPubSubTopic = 'y-ipfs:rooms:' + options.room

      console.log('topic:', topic)

      this.roomEmitter = options.roomEmitter || new EventEmitter()
      this.roomEmitter.peers = () => this._room.getPeers()
      this.roomEmitter.id = () => topic

      this._room = Room(this.ipfs, topic)

      this._room.on('message', (msg) => {
        const message = decode(msg.data)
        console.log('got message from ' + msg.from + ': ', message)
        this.receiveMessage(msg.from, )
      })

      this._room.on('peer joined', (peer) => {
        console.log('peer joined', peer)
        this.roomEmitter.emit('peer joined', peer)
        this.userJoined(peer, 'master ')
      })

      this._room.on('peer left', (peer) => {
        console.log('peer left', peer)
        this.roomEmitter.emit('peer left', peer)
        this.userLeft(peer)
      })

      if (this.ipfs.isOnline()) {
        this._start()
      } else {
        this.ipfs.once('ready', this._start.bind(this))
      }
    }

    _start () {
      console.log('starting...')
      const id = this.ipfs._peerInfo.id
      this._ipfsUserId = id
      this.setUserId(id)
    }

    disconnect () {
      log('disconnect')
      this._room.leave()
      super.disconnect()
    }
    send (peer, message) {
      console.log('send', peer, message)
      this._room.sendTo(peer, encode(message))
    }
    broadcast (message) {
      log('broadcasting', message)
      this._room.broadcast(encode(message))
    }
    isDisconnected () {
      return false
    }
  }
  Y.extend('ipfs', YIpfsConnector)
}

module.exports = extend
if (typeof Y !== 'undefined') {
  extend(Y)
}

