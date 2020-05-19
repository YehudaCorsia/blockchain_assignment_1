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
        this.connection = new P2pConnection(srcPort, dstPorts);

    }

    // All codes in menu.
    menuCommandCodeTransaction = 1;
    menuCommandCodeVerify = 2;
    menuCommandViewAllTransaction = 3;
    menuCommandCodePrintMyPublic = 4;
    menuCommandCodeMine = 5;
    menuCommandCodeGetBalance = 6;

    minerRun() {
        this.connection.topology = topology(this.connection.myIp, this.connection.peerIps)
            .on('connection', (socket, peerIp) => {
                const peerPort = this.connection.extractPortFromIp(peerIp);
                this.connection.sockets[peerPort] = socket;
                this.connection.peers.push(peerPort);

                if (!this.connectedOnce) {
                    this.connectedOnce = true;
                    this.showMenu();
                    super.performGenesisTransaction();
                    console.log('connected to peer - ', peerPort);
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
                        else if (command === this.menuCommandCodeMine) {
                            this.mine();

                            for (const p of this.connection.peers) {
                                this.connection.sockets[p].write("minChain: " + JSON.stringify(this.blockChain.getMinChain()));
                            }
                        }
                        else if (command === this.menuCommandCodeGetBalance) {
                            const balance = this.blockChain.getBalanceOfAddress(params[1]);
                            console.log('balance: ' + balance);
                        }

                        this.showMenu();
                    });
                }

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

        console.log(`Hash ${txHash} is not in the block chain!`);
        return
    }

    showMenu() {
        console.log('\n\n=========================================');
        console.log(this.menuCommandCodeTransaction + ' : Transaction [usage: <dst address> <amount>]')
        console.log(this.menuCommandCodeVerify + ' : Verify [usage: <full node port> <hash>]')
        console.log(this.menuCommandViewAllTransaction + ' : View all transaction hashes of this wallet');
        console.log(this.menuCommandCodePrintMyPublic + ' : Print my public address');
        console.log(this.menuCommandCodeMine + ' : Mine 3 transactions (+ reward transaction)');
        console.log(this.menuCommandCodeGetBalance + ' : Get balacne [usage: <address>]');
        console.log('=========================================\n\n');
    }
}

module.exports.Miner = Miner;