const {
    stdin,
    exit,
    argv
} = process
const { Wallet } = require('./src/wallet/wallet.js');
const { FullNode } = require('./src/wallet/fullNode.js');

const params = extractPeersAndMyPort();

let wallet;
if (params.type === 'fullNode') {
    wallet = new FullNode(params.me, params.peers);
    wallet.fullNodeMain();
} else if (params.type === 'spv') {
    wallet = new Wallet(params.me, params.peers);
    wallet.spvMain();
} else {
    console.log(`${params.type} is not a supported type`);
}

function extractPeersAndMyPort() {
    return {
        type: argv[2],
        me: argv[3],
        peers: argv.slice(4, argv.length)
    }
}