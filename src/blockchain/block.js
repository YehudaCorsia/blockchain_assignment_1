const SHA256 = require('crypto-js/sha256');
const EC = require('elliptic').ec;
const ec = new EC('secp256k1');
// const { MerkleTree } = require('../algo/merkleTree.js');
var MerkleTools = require('merkle-tools')
const { BloomFilter } = require('bloom-filters');

class Block {
    constructor(timestamp, transactions, perviousHash = "") {
        this.perviousHash = perviousHash;
        this.timestamp = timestamp;
        this.transactions = transactions;
        this.bloomFilter = this.getBloomFilterWith(transactions);
        this.hash = this.calculateHash();
        this.nonce = 0;

        this.merkleTree = new MerkleTools();
        this.transactionsHashes = [];

        // Get all hashes of transactions
        for (let i = 0; i < transactions.length; i++) {
            const txHash = transactions[i].calculateHash();
            this.transactionsHashes.push(txHash);
        }

        this.merkleTree.addLeaves(this.transactionsHashes)
        this.merkleTree.makeBTCTree(false)
        this.merkleRoot = this.merkleTree.getMerkleRoot();
    }


    getBloomFilterWith(transactions) {
        const ln2 = Math.log(2);
        const m = Math.floor((-4 * Math.log(0.001)) / (Math.pow(ln2, 2)));
        const k = Math.floor((m / 4) * ln2);

        let bloom = new BloomFilter(m, k);

        for (const tx of transactions) {
            bloom.add(tx.calculateHash());
        }

        return bloom;
    }

    calculateHash() {
        return SHA256(this.perviousHash +
            this.timestamp +
            this.merkleRoot + //?
            this.nonce).toString();
    }

    mineBlock(difficulty) {
        while (this.hash.substring(0, difficulty) !== Array(difficulty + 1).join('0')) {
            this.nonce++;
            this.hash = this.calculateHash();
        }

        console.log("Block mined " + this.hash);
    }

    hasValidTransactions() {
        for (const tx of this.transactions) {
            if (!tx.isValid()) {
                return false;
            }
        }
        return true;
    }

    getVerificationHashesFor(txHash) {
        var indexOfHash = this.transactionsHashes.indexOf(txHash)
        return this.merkleTree.getProof(indexOfHash)
        // return this.merkleTree.getVerificationHashesFor(txHash);
    }

    isTransactionInThisBlock(txHash) {
        console.log('Transactions block:\n'+this.transactions.map(x => x.calculateHash()));
        if (this.bloomFilter.has(txHash)) {
            if (this.transactions.find(element => element.calculateHash() === txHash)) {
                return true;
            }
        }

        return false;
    }
}

module.exports.Block = Block;
