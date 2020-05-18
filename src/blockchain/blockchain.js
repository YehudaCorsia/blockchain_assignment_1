const SHA256 = require('crypto-js/sha256');
const EC = require('elliptic').ec;
const ec = new EC('secp256k1');
const {Block} = require('./block.js');
const {Transaction} = require('../blockchain/transaction.js');

class Blockchain {
    constructor() {
        this.chain = [this.createGenesisBlock()];
        this.difficulty = 4;
        this.pendingTransactions = [];
        this.mineReward = 100;
    }

    createGenesisBlock() {
        return new Block("01/04/2020", [], "0");
    }

    getLatestBlock() {
        return this.chain[this.chain.length - 1];
    }

    minePendingTransactions(miningRewardAddress, pendingTransactions) {
        const rewardTx = new Transaction(null, miningRewardAddress, this.mineReward);
        pendingTransactions.push(rewardTx);
        console.log(pendingTransactions)
        let block = new Block(Date.now(), pendingTransactions, this.getLatestBlock().hash);

        block.mineBlock(this.difficulty);
        console.log('Block successfully mined.');

        this.chain.push(block);
    }

    getBalanceOfAddress(address) {
        let balance = 0;

        for (const block of this.chain) {
            for (const tran of block.transactions) {
                tran.amount = parseInt(tran.amount, 10);
                if (tran.fromAddress === address) {
                    balance -= tran.amount;
                }
                if (tran.toAddress === address) {
                    balance += tran.amount;
                }
            }
        }

        return balance;
    }

    addPendTransaction(transaction) {
        if (!transaction.fromAddress || !transaction.toAddress) {
            throw new Error('not valid must from ant to address');
        }

        if (!transaction.isValid()) {
            throw new Error('not valid');
        }

        this.pendingTransactions.push(transaction);
    }

    isChainValid() {
        for (let i = 1; i < this.chain.length; i++) {
            const currentBlock = this.chain[i];
            const previousBlock = this.chain[i - 1];

            if (!currentBlock.hasValidTransactions()) {
                return false;
            }
            if (currentBlock.hash !== currentBlock.calculateHash()) {
                return false;
            }
            if (currentBlock.perviousHash !== previousBlock.calculateHash()) {
                return false;
            }
        }

        return true;
    }

    getMinChain() {
        let result = {};
        
        // todo: change x to called block. maybe...
        for (const currentBlock of this.chain) {
            result[currentBlock.calculateHash()] = currentBlock.merkleRoot;
        }
        
        return result;
    }
}

module.exports.Blockchain = Blockchain;
