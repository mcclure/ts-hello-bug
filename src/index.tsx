import { h, JSX, render, Component } from "preact"
import linkState from 'linkstate';
import { State, WrapStateContexts } from "./gui/state"
import { writeStreamWithUleb, ulebLengthFromStream, lengthToUleb } from "./bin/leb"
import { StreamByteReader, ItBlByteReader } from "./bin/byteStream"
import { Record, List, OrderedSet } from "immutable-oss"
import { encode, decode } from "@msgpack/msgpack"
import { createWriteStream } from "streamsaver" // Currently used only in Debug
import { Node } from "./p2p/browser-bundle" // Networking

import { encode as encode11, decode as decode11 } from 'base2048'
import { encode as encode15, decode as decode15 } from 'base32768'
import { encode as encode16, decode as decode16 } from 'base65536'
const multihashing = require("multihashing-async")
const CID = require('cids')
const itPipe = require('it-pipe')

import { sign as naclSign } from 'tweetnacl';

const siteName = "DHT Connection Test"
const helloProtocolName = "kad-dht-hello"
const protocolName = "cruddy-dht-demo-bug"
const protocolVersion = "0.0.0"
const postMaxLength = 500
const verboseNetwork = true

// ----- Data helpers -----

// Turn a function into a compliant event handler
function handle(f:()=>void) {
  return (e:JSX.TargetedEvent) => {
    e.preventDefault();
    f();
    return true;
  }
}

const login = new State<string>(null)

// ----- Networking -----

const helloProtocolString = `/${helloProtocolName}`
const protocolString = `/${protocolName}/${protocolVersion}`

// Call to append to error list
function logError(tag:string, err:Error, isFatal:boolean) {
  if (!isFatal)
    console.log(tag, err)
  else
    throw new Error(`${tag}: ${err}`)
}

function logErrorIncoming(err:string) {
  console.log("Incoming connection error", err)
}

async function cidForData(data:Uint8Array) {
  // We want to use the 256-bit public key as a 256-bit Kademlia key.
  // libp2p won't let us do that. We have to convert it to a "multihash" and then to a "CID".
  // This appears to mutate the key along the way, but I'm not sure how.
  // This is the best I can find for how to make a "CID" https://github.com/multiformats/js-cid#usage
  // TODO: Try skipping multihash and just sending value
  const signKeyMultihash = await multihashing(data, 'sha2-256') // Does this *create* a SHA256 or simply *tag* as SHA256?
  // Note 0x12 for SHA-256
  return new CID(1, 0x12, signKeyMultihash)
}

// Networking

const clientMessage = new Uint8Array([0])
const serverMessage1 = new Uint8Array([5])
const serverMessage2 = new Uint8Array([1,2,3,4,5])

async function connectP2P(idKey: Uint8Array, targetKey:Uint8Array, client:boolean) {
  let phase = "Startup"
  try {
    const node = await Node

    phase = "Configuration"
    
    node.handle([helloProtocolString], ({ protocol, stream }:{protocol:string, stream:any}) => {
      (async () => {
        // DO NOTHING? TODO: CONSIDER CLOSING STREAM?
      })()
    })

    node.handle([protocolString], ({ protocol, stream }:{protocol:string, stream:any}) => {
      (async () => {
        // NODE CONNECT HERE
        console.log("PROTOCOL CONNECT!", stream.timeline, stream)
        console.log("In this example, server expects:", clientMessage)
        
        // This is the code for the "server"
        // Input one message then send a reply
        // Intentionally leak promise
        itPipe(
          stream,
          async function (source:any) {
            const messageRead = source.next() // Read one message and print it
            console.log("Server Done?", messageRead.done, "Received", messageRead.value)
            
            return itPipe(
              [serverMessage1, serverMessage2],
              stream
            )
          }
        )

        console.log("CONNECTED PIPE", stream.timeline)
      })()
    })


    // Don't connect to or gossip about nodes unless they support the required protocol
    node.peerStore.on('change:protocols', ({ peerId, protocols }:{peerId:any, protocols:any}) => {
      if (!protocols.includes(helloProtocolString)) {
        node.hangUp(peerId)
        node.peerStore.addressBook.delete(peerId)
        if (verboseNetwork) console.log("Rejecting peer", peerId.toB58String(), "for lack of protocol", protocolString, "supported protocols", protocols)
      } else {
        if (verboseNetwork) console.log("Accepting peer", peerId.toB58String(), "with protocol", protocolString)
        // JUL21: Do send here or lower?
      }
    })

    node.on('peer:discovery', (peerId:any) => {
      const peerIdStr = peerId.toB58String()
      if (verboseNetwork) console.log("Discovered peer", peerIdStr)
    })

    node.connectionManager.on('peer:connect', (connection:any) => {
      const peerIdStr = connection.remotePeer.toB58String()
      if (verboseNetwork) console.log("Connected peer", peerIdStr)
    })

    node.connectionManager.on('peer:disconnect', (connection:any) => {
      const peerIdStr = connection.remotePeer.toB58String()
      if (verboseNetwork) console.log("Disconnected peer", peerIdStr)
    })

    phase = "Connection"
    await node.start();

    const selfPeerIdStr = node.peerId.toB58String()

    phase = "Cleanup"

    if (verboseNetwork) console.log("Started, self is", selfPeerIdStr)

    if (verboseNetwork) {
      let nodeI = 0
      node.multiaddrs.forEach((ma:any) => {
        // FIXME: Should these be added to the Connected or Discovery lists? 
        console.log("Starting peer", nodeI++, ":", ma.toString())
      })
    }

    phase = "Waiting 5 seconds..."
    const delay = require('delay')
    // See https://github.com/libp2p/js-libp2p/issues/950
    await delay(5000)

    // BEGIN DOWNLOAD
    if (client) {
      phase = "Waiting 5 more seconds..."
      // Simulating delay before button click
      await delay(5000)

      phase = "Connecting to DHT"

      console.log("Client searching...")
      const targetCid = await cidForData(targetKey)
      let targetMultiaddr
      for await (const provider of node.contentRouting.findProviders(targetCid)) {
        console.log("GOT")
        console.log(provider)
        targetMultiaddr = provider
        break
      }
      console.log("DONE SEARCH")

      phase = "Connecting to DHT peer"

      console.log("Client querying...")
      console.log("In this example, client expects:", serverMessage1, "then", serverMessage2)
      
      const { stream } = await node.dialProtocol(targetMultiaddr.id, protocolString)

      // This is the code for the "client"
      // Send one message, then indefinitely print everything received 
      // Intentionally leak promise
      itPipe(
        [clientMessage], // Message client sends
        stream, // "Write to the stream, and pass its output to the next function"
        async function (source:any) {
          for await (const msg of source) {
            console.log('Client received received msg', msg)
          }
        }
      )
    } else {
      console.log("Server publishing...")
      const cid = await cidForData(idKey)
      console.log("PROVIDING", cid)
      await node.contentRouting.provide(cid) // Warning: Do this too early 
    }


  } catch (e) {
    logError(`${phase} failure`, e, true)
  }
}

// ----- GUI -----

let parentNode = document.getElementById("content")
let replaceNode = document.getElementById("initial-loading")

// arguments are assumed to be numbers 0-9
function StartButton(props: {id:number, target:number, client:boolean}) {
  let name = "0x"
  let idKey = new Uint8Array(8)
  let targetKey = new Uint8Array(8)
  for(let idx = 0; idx < 8; idx++) {
    idKey[idx] = props.id
    targetKey[idx] = props.target
    name = name + "0" + props.id
  }
  name += (props.client ? " (client)" : " (server only)")

  return <form onSubmit={(e)=>{
      e.preventDefault()

      // Perform login here
      login.set(name)
      connectP2P(idKey, targetKey, props.client)
      // Done

      return true
    }}>
      <input type="submit" value={name} />
  </form>
}

// Toplevel element, handles state
function Page() {
  const loginV = login.get()

  if (!loginV) {
    return <div className="Page">
      <div>Log in as:</div>
      <div><StartButton id={1} target={2} client={false} /></div>
      <div><StartButton id={2} target={1} client={true} /></div>
    </div>
  }

  return (
    <div className="Page">Connected as {loginV}<br />Please see inspector console.</div>
  )
}

render(
  WrapStateContexts(<Page />, [login]),
  parentNode, replaceNode
)
