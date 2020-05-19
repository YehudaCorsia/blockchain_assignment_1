const topology = require('fully-connected-topology')
const {
    stdin,
    exit,
    argv
} = process

class P2pConnection {
    constructor(mePort, peersPort) {
        this.me = mePort;
        this.peers = peersPort;
        this.myIp = this.toLocalIp(this.me);
        this.peerIps = this.getPeerIps(this.peers);
        this.sockets = {}
        this.topology = {}
    }

    toLocalIp(port) {
        return `127.0.0.1:${port}`
    }

    getPeerIps(peers) {
        if (peers){
            return peers.map(peer => this.toLocalIp(peer))
        }
        else {
            return []
        }
    }

    extractPortFromIp(peer) {
        return peer.toString().slice(peer.length - 4, peer.length);
    }

    connect(wallet) {
        this.topology = topology(this.myIp, this.peerIps).on('connection', (socket, peerIp) => {
            const peerPort = extractPortFromIp(peerIp)
            console.log('connected to peer - ', peerPort)

            this.sockets[peerPort] = socket

            // { //on user input
            //     const message = data.toString().trim()
            //     if (message === 'exit') { //on exit
            //         log('Bye bye')
            //         exit(0)
            //     }

            //     const receiverPeer = extractReceiverPeer(message)
            //     if (sockets[receiverPeer]) { //message to specific peer
            //         if (peerPort === receiverPeer) { //write only once
            //             sockets[receiverPeer].write(formatMessage(extractMessageToSpecificPeer(message)))
            //         }
            //     } else { //broadcast message to everyone
            //         socket.write(formatMessage(message))
            //     }
            // }
            stdin.on('data', data => wallet.onInput(data.toString().trim()));

            //print data when received
            socket.on('data', data => log(data.toString('utf8')))
        })
    }
}

//'hello' -> 'myPort:hello'
function formatMessage(message) {
    return `${me}>${message}`
}

//'127.0.0.1:4000' -> '4000'
function extractPortFromIp(peer) {
    return peer.toString().slice(peer.length - 4, peer.length);
}

//'4000>hello' -> '4000'
function extractReceiverPeer(message) {
    return message.slice(0, 4);
}

//'4000>hello' -> 'hello'
function extractMessageToSpecificPeer(message) {
    return message.slice(5, message.length);
}

module.exports.P2pConnection = P2pConnection;