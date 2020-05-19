var fs = require('fs');
const {Transaction} = require('../blockchain/transaction.js');
const path = 'src/pool/mempool.json'

function readMemPool() {
    let rawdata = fs.readFileSync(path);
    if (rawdata.toString()) {
        return JSON.parse(rawdata);   
    }

    return [];
}

function appendToMemPool(transaction) {
    let data = readMemPool();
    data.push(transaction);
    fs.writeFileSync(path, JSON.stringify(data));
}

function writeToMemPool(transactions) {
    fs.writeFileSync(path, JSON.stringify(transactions));
}

module.exports.readMemPool = readMemPool;
module.exports.appendToMemPool = appendToMemPool;
module.exports.writeToMemPool = writeToMemPool;