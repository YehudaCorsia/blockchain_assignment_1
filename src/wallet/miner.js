const { Blockchain } = require('../blockchain/blockchain.js');
const { readMemPool, writeToMemPool } = require('../pool/pool.js');
const { Wallet } = require('./wallet.js')
const { P2pConnection } = require('../p2p/p2p.js')
const topology = require('fully-connected-topology');
const { Transaction } = require('../blockchain/transaction.js');

const {
    stdin,
    argv
} = process

class Miner extends Wallet {
    constructor(srcPort, dstPorts) {
        super(srcPort, dstPorts);
        this.blockChain = new Blockchain();
    }

    fullNodeRun() {
        this.connection.topology = topology(this.connection.myIp, this.connection.peerIps)
            .on('connection', (socket, peerIp) => {
                this.showMenu();
                super.performGenesisTransaction();
                const peerPort = this.connection.extractPortFromIp(peerIp);
                this.connection.sockets[peerPort] = socket;
                console.log('connected to peer - ', peerPort);

                stdin.on('data', data => {
                    const params = data.toString().trim().split(' ');
                    if (params[0] === '1') {
                        super.performTransaction(params[1], params[2]);
                    }
                    else if (params[0] === '2') {
                        this.mine();

                        for (const p of this.connection.peers) {
                            this.connection.sockets[p].write("minChain: " + JSON.stringify(this.blockChain.getMinChain()));
                        }
                    } else if (params[0] === '3') {
                        const balance = this.blockChain.getBalanceOfAddress(params[1]);
                        console.log('balance: ' + balance);
                    }

                    this.showMenu();
                });

                socket.on('data', data => {
                    const msg = data.toString().trim();
                    if (msg.slice(0, 6) === 'verify') {
                        const params = msg.split(' ');
                        const results = this.getVerificationFor(params[2]);
                        if (results) {
                            this.connection.sockets[params[1]].write("vr " + params[2] +
                                " " + JSON.stringify(results));
                        } else {
                            this.connection.sockets[params[1]].write("vr " + params[2] + " -1");
                        }
                    }
                })
            });
    }

    mine() {
        let transactions = [];
        let transactionsData = readMemPool();

        for (const tx of transactionsData) {
            transactions.push(Object.assign(new Transaction, tx));
        }

        this.blockChain.minePendingTransactions(this.address, transactions.slice(0, 3));

        writeToMemPool(transactions.slice(3, transactions.length));
    }

    getVerificationFor(txHash) {
        for (const block of this.blockChain.chain) {
            if (block.isTransactionInThisBlock(txHash)) {
                return { 'blockHash': block.hash, 'hashes': block.getVerificationHashesFor(txHash) };
            }
        }

        console.log(`hash ${txHash} is not in the block chain!`);
        return
    }

    showMenu() {
        console.log('=========================================');
        console.log('my public address: ' + this.address);
        console.log('1: transaction [usage: 1 <dst address> <amount>]')
        console.log('2: mine 3 transactions (+ reward transaction)');
        console.log('3: get balacne [usage: 3 <address>]');
        console.log('=========================================');
    }
}

module.exports.Miner = Miner;