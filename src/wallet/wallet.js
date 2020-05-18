const { Transaction } = require('../blockchain/transaction.js');
const { generatePair } = require('../algo/keyGenerator.js');
const { appendToMemPool } = require('../pool/pool.js');
const { P2pConnection } = require('../p2p/p2p.js')
const EC = require('elliptic').ec;
const topology = require('fully-connected-topology');
const SHA256 = require('crypto-js/sha256');
const {
    stdin,
    exit,
    argv
} = process

const ec = new EC('secp256k1');

class Wallet {
    constructor(srcPort, dstPorts) {
        let pair = generatePair();
        this.key = ec.keyFromPrivate(pair.private);
        this.address = this.key.getPublic('hex');
        this.currentWalletTransactions = [];
        this.minChain = {};
        this.connection = new P2pConnection(srcPort, dstPorts);
    }

    spvMain() {
        this.connection.topology = topology(this.connection.myIp, this.connection.peerIps)
            .on('connection', (socket, peerIp) => {
                this.printMenu();
                this.performGenesisTransaction();
                const peerPort = this.connection.extractPortFromIp(peerIp);
                this.connection.sockets[peerPort] = socket;
                console.log('connected to peer - ', peerPort);

                stdin.on('data', data => {
                    const params = data.toString().trim().split(' ');

                    if (params[0] === '1') {
                        this.performTransaction(params[1], params[2]);
                    }
                    else if (params[0] === '3') {
                        console.log('my transactions:')
                        for (const tx of this.currentWalletTransactions) {
                            console.log(tx);
                        }
                    }
                    else if (params[0] === '2') {
                        console.log(params);
                        const fnSocket = this.connection.sockets[params[1]];
                        const vmsg = "verify: " + this.connection.me + " " + params[2];
                        fnSocket.write(vmsg);
                    }

                    this.printMenu();
                });

                socket.on('data', data => {
                    const msg = data.toString().trim();
                    if (msg.slice(0, 8) === 'minChain') {
                        this.minChain = JSON.parse(msg.slice(9, msg.length));
                        console.log('received min chain.');
                    } else if (msg.slice(0, 2) === 'vr') {
                        const params = msg.split(' ');
                        const txHash = params[1];

                        if (params[2] === '-1') {
                            console.log(`hash ${txHash} is not verified!`)
                        } else {
                            const results = JSON.parse(params[2]);
                            if (this.verify(txHash, results)) {
                                console.log(`${txHash} is verified!`);
                            } else {
                                console.log(`${txHash} is not verified!`);
                            }
                        }
                    }
                });
            });
    }

    performTransaction(dst, amount) {
        let tx = new Transaction(this.address, dst, amount);
        tx.signTransaction(this.key);
        this.currentWalletTransactions.push(tx.calculateHash());
        appendToMemPool(tx);
    }

    performGenesisTransaction() {
        let tx = new Transaction(null, this.address, 1000);
        appendToMemPool(tx);
    }

    verifiyAllTransactions(fnSocket) {
        for (const tx of this.currentWalletTransactions) {
            if (this.verify(tx.calculateHash(), fnSocket)) {
                console.log(`tx : ${tx} is verified!`);
            } else {
                console.log(`tx : ${tx} is not verified, something happened!`);
            }
        }
    }

    verify(txHash, results) {
        let hashToCheckAgainst = txHash;
        let root = this.minChain[results['blockHash']];

        for (const hash in results['hashes']) {
            console.log("zubi " + results['hashes'][hash])
            if (results['hashes'][hash] === 'after') {
                console.log('hash to check agains: ' + hashToCheckAgainst);
                hashToCheckAgainst = SHA256(hashToCheckAgainst + hash).toString();
            } else {
                hashToCheckAgainst = SHA256(hash + hashToCheckAgainst).toString();
            }
        }

        console.log("calc: " + hashToCheckAgainst + "\nroot: " + root)

        return hashToCheckAgainst === root;
    }

    printMenu() {
        console.log('=========================================');
        console.log('my public address: ' + this.address);
        console.log('1: transaction [usage: 1 <dst address> <amount>]')
        console.log('2: verify [usage: 2 <full node port> <hash>]')
        console.log('3: view all transaction hashes of this wallet (copy and paste to (2) if you want to verify');
        console.log('=========================================');
    }
}

module.exports.Wallet = Wallet;