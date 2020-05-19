const {
    stdin,
    argv
} = process
const { Wallet } = require('./src/wallet/wallet.js');
const { Miner } = require('./src/wallet/miner.js');

var ArgumentParser = require('argparse').ArgumentParser;

const logo = "\
\n\
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+\n\
|B|A|Y|-|B|L|O|C|K|C|H|A|I|N|\n\
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+\n\
\n\
"
console.log(logo)
console.log("Welcome to a new world of coins!")
console.log("Welcome to Ben and Corsia blockchain wallet :-)")

var parser = new ArgumentParser({
  version: '1.0',
  addHelp: true,
  description: 'CyberCloudBlockchain by Yehdua & Ben'
});
 
parser.addArgument(
  ['-n', '--node-type'], {
    help: 'Node type',
    choices: ['miner', 'spv'],
    required: true
  }
);
parser.addArgument(
  ['-lp', '--local-port'], {
    help: 'Local port',
    type: "int",
    required: true
  }
);
parser.addArgument(
  ['-rnp', '--remote-nodes-ports'], {
    help: 'Ports of the remote nodes',
    nargs: '*',
    type: "int",
    required: false
  }
);
 
var args = parser.parseArgs();
 
let wallet
if (args.remote_nodes_ports === null)
{
  args.remote_nodes_ports = []
}
 
if (args.node_type === "miner") {
  wallet = new Miner(args.local_port, args.remote_nodes_ports);
  wallet.minerRun();
} else if (args.node_type === "spv") {
  wallet = new Wallet(args.local_port, args.remote_nodes_ports);
  wallet.spvRun();
}
