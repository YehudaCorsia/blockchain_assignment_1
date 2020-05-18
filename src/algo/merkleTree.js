const SHA256 = require("crypto-js/sha256");
const EC = require('elliptic').ec
const ec = new EC('secp256k1');
const {Block} = require('../blockchain/block.js')
const {Blockchain} = require('../blockchain/blockchain.js')
const {Transaction} = require('../blockchain/transaction.js')


class MerkleTree {
    constructor(transactions) {
        this.leavesMap = {};
        this.transactionHashes = [];
        this.calculatedHashes = [];
        this.treeSize = Math.pow(2, (Math.log2(transactions.length) + 1)) - 1;

        for (let i = 0; i < transactions.length; i++) {
            const txHash = transactions[i].calculateHash();
            this.leavesMap[txHash] = i;
            this.transactionHashes.push(txHash);
        }
    }

    init() {
        const logOfSize = Math.log2(this.transactionHashes.length);
        if (logOfSize !== Math.floor(logOfSize)) {
            throw new Error(`transactions amount must be {2^n | n > 1}`);
        }

        for (const transaction of this.transactionHashes) {
            this.calculatedHashes.push(transaction);
        }

        while(this.calculatedHashes.length > 1) {
            const hash = SHA256(this.calculatedHashes.shift() + this.calculatedHashes.shift()).toString();

            this.calculatedHashes.push(hash);
            this.transactionHashes.push(hash);
        }

        console.log('merkle hashes ordered array:');
        console.log(this.transactionHashes);

        return this.calculatedHashes[0]; //root
    }

    getVerificationHashesFor(transactionHash) {
        let currentIndex = this.leavesMap[transactionHash];
        let nextLevel = this.getLeafesAmount();
        let nextStartPos = nextLevel;
        let results = {};

        if (currentIndex %2 === 0) {
            results[this.transactionHashes[currentIndex + 1]] = 'after';
        } else {
            results[this.transactionHashes[currentIndex - 1]] = 'before';
        }

        while(Object.keys(results).length < Math.log2(this.getLeafesAmount())) {
            currentIndex = Math.floor(currentIndex / 2);

            if (currentIndex %2 === 0) {
                results[this.transactionHashes[nextStartPos + currentIndex + 1]] = 'after';
            } else {
                results[this.transactionHashes[nextStartPos + currentIndex - 1]] = 'before';
            }

            nextLevel = Math.floor(nextLevel / 2);
            nextStartPos += nextLevel;
        }

        return results;
    }
    
    getLeafesAmount() {
        return Math.pow(2, Math.log2(this.treeSize + 1) - 1);
    }
}
module.exports.MerkleTree = MerkleTree;
// // =================================
// // ========usage example============
// // =================================
// const txs = []
// const myKey = ec.keyFromPrivate('08104e76e48955b5905c39df70389d0c1ca8a0a891d326ce951b6dcd37d055a0');
// const myWalletAddress = myKey.getPublic('hex'); 

// const tx1 = new Transaction(myWalletAddress, 'address1', 50);
// txs.push(tx1);
// txs.push(new Transaction(myWalletAddress, 'address2', 50));
// txs.push(new Transaction(myWalletAddress, 'address3', 50));
// txs.push(new Transaction(myWalletAddress, 'address4', 50));

// const merkle = new MerkleTree(txs);
// const root = merkle.init();
// const results = merkle.getVerificationHashesFor(tx1.calculateHash());
// console.log(`results =`);
// console.log(results);

// let verificationHash = tx1.calculateHash();
// console.log(tx1.calculateHash());

// for (hash in results) {
//     if (results[hash] === 'after') {
//         verificationHash = SHA256(verificationHash + hash).toString();
//     } else {
//         verificationHash = SHA256(hash + verificationHash).toString();
//     }
// }

// console.log(`verificationHash: ${verificationHash}\nroot\t\t: ${root}`);