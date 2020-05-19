const { Transaction } = require('../blockchain/transaction.js');
const { generatePair } = require('../algo/keyGenerator.js');
const { appendToMemPool } = require('../pool/pool.js');
const { P2pConnection } = require('../p2p/p2p.js')
const EC = require('elliptic').ec;
const topology = require('fully-connected-topology');
const SHA256 = require('crypto-js/sha256');
const {
    stdin,
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
        this.connectedOnce = false;
    }

    menuCodeCommandInParams = 0;

    // All codes in menu.
    menuCommandCodeTransaction = 1;
    menuCommandCodeVerify = 2;
    menuCommandViewAllTransaction = 3;
    menuCommandCodePrintMyPublic = 4;


    spvRun() {
        this.connection.topology = topology(this.connection.myIp, this.connection.peerIps)
            .on('connection', (socket, peerIp) => {

                const peerPort = this.connection.extractPortFromIp(peerIp);
                this.connection.sockets[peerPort] = socket;
                console.log('Connected to : ', peerPort);

                if (!this.connectedOnce) {
                    this.connectedOnce = true;
                    this.performGenesisTransaction();
                    this.showMenu();


                    stdin.on('data', data => {
                        const params = data.toString().trim().split(' ');
                        const command = parseInt(params[this.menuCodeCommandInParams], 10);

                        if (command === this.menuCommandCodeTransaction) {
                            this.performTransaction(params[1], params[2]);
                        }
                        else if (command === this.menuCommandCodeVerify) {
                            console.log(params);
                            const fnSocket = this.connection.sockets[params[1]];
                            const vmsg = "verify: " + this.connection.me + " " + params[2];
                            fnSocket.write(vmsg);
                        }
                        else if (command === this.menuCommandViewAllTransaction) {
                            console.log('my transactions:')
                            for (const tx of this.currentWalletTransactions) {
                                console.log(tx);
                            }
                        }
                        else if (command === this.menuCommandCodePrintMyPublic) {
                            console.log('My public address: \n' + this.address);
                        }

                        this.showMenu();
                    });
                }

                socket.on('data', data => {
                    const minChainSize = 8
                    const msg = data.toString().trim();
                    if (msg.slice(0, minChainSize) === 'minChain') {
                        this.minChain = JSON.parse(msg.slice(minChainSize + 1, msg.length));
                        console.log('Received min chain.');
                    } else if (msg.slice(0, 2) === 'vr') {
                        const params = msg.split(' ');
                        const txHash = params[1];

                        if (params[2] === '-1') {
                            console.log(`hash ${txHash} is not verified.`)
                        } else {
                            const results = JSON.parse(params[2]);
                            if (this.verify(txHash, results)) {
                                console.log(`${txHash} is verified.`);
                            } else {
                                console.log(`${txHash} is not verified.`);
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
                console.log(`tx : ${tx} is not verified.`);
            }
        }
    }

    verify(txHash, results) {
        let hashToCheckAgainst = txHash;
        let root = this.minChain[results['blockHash']];

        for (const hash in results['hashes']) {
            if (results['hashes'][hash] === 'after') {
                console.log('Hash to check agains: ' + hashToCheckAgainst);
                hashToCheckAgainst = SHA256(hashToCheckAgainst + hash).toString();
            } else {
                hashToCheckAgainst = SHA256(hash + hashToCheckAgainst).toString();
            }
        }

        console.log("calc: " + hashToCheckAgainst + "\nroot: " + root)

        return hashToCheckAgainst === root;
    }


    showMenu() {
        console.log('\n\n=========================================');
        console.log(this.menuCommandCodeTransaction + ' : Transaction [usage: <dst address> <amount>]')
        console.log(this.menuCommandCodeVerify + ' : Verify [usage: <full node port> <hash>]')
        console.log(this.menuCommandViewAllTransaction + ' : View all transaction hashes of this wallet');
        console.log(this.menuCommandCodePrintMyPublic + ' : Print my public address');
        console.log('=========================================\n\n');
    }
}

module.exports.Wallet = Wallet;