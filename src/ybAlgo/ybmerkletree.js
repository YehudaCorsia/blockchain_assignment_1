var sha3256 = require('js-sha3').sha3_256
var crypto = require('crypto')

var YBMerkleTree = function () {
  if (!(this instanceof YBMerkleTree)) {
    return new YBMerkleTree()
  }

  var hashType = 'sha256'

  var hashFunction = function (value) {
    switch (hashType) {
      case 'SHA3-256':
        return Buffer.from(sha3256.array(value))
      default:
        return crypto.createHash(hashType).update(value).digest()
    }
  }

  var tree = {}
  tree.leaves = []
  tree.levels = []
  tree.isReady = false

  this.addLeaves = function (valuesArray) {
    tree.isReady = false
    valuesArray.forEach(function (value) {
      tree.leaves.push(_getBuffer(value))
    })
  }

  this.makeTree = function () {
    tree.isReady = false
    var leafCount = tree.leaves.length
    if (leafCount > 0) {
      tree.levels = []
      tree.levels.unshift(tree.leaves)
      while (tree.levels[0].length > 1) {
        tree.levels.unshift(_calculateNextLevel())
      }
    }
    tree.isReady = true
  }

  this.getMerkleRoot = function () {
    if (!tree.isReady || tree.levels.length === 0) return null
    return tree.levels[0][0]
  }

  this.buildAndGetProofArray = function (index, asBinary) {
    if (!tree.isReady) return null
    var currentRowIndex = tree.levels.length - 1
    if (index < 0 || index > tree.levels[currentRowIndex].length - 1) return null

    var proof = []
    for (var x = currentRowIndex; x > 0; x--) {
      var currentLevelNodeCount = tree.levels[x].length
      if (index === currentLevelNodeCount - 1 && currentLevelNodeCount % 2 === 1) {
        index = Math.floor(index / 2)
        continue
      }

      var isRightNode = index % 2
      var siblingIndex = isRightNode ? (index - 1) : (index + 1)

      if (asBinary) {
        proof.push(Buffer.from(isRightNode ? [0x00] : [0x01]))
        proof.push(tree.levels[x][siblingIndex])
      } else {
        var sibling = {}
        var siblingPosition = isRightNode ? 'left' : 'right'
        var siblingValue = tree.levels[x][siblingIndex].toString('hex')
        sibling[siblingPosition] = siblingValue

        proof.push(sibling)
      }

      index = Math.floor(index / 2)
    }

    return proof
  }

  this.validateProofArray = function (proof, targetHash, merkleRoot, doubleHash) {
    targetHash = _getBuffer(targetHash)
    merkleRoot = _getBuffer(merkleRoot)
    if (proof.length === 0) return targetHash.toString('hex') === merkleRoot.toString('hex')

    var proofHash = targetHash
    for (var x = 0; x < proof.length; x++) {
      if (proof[x].left) { 
        if (doubleHash) { proofHash = hashFunction(hashFunction(Buffer.concat([_getBuffer(proof[x].left), proofHash]))) } else { proofHash = hashFunction(Buffer.concat([_getBuffer(proof[x].left), proofHash])) }
      } else if (proof[x].right) {
        if (doubleHash) { proofHash = hashFunction(hashFunction(Buffer.concat([proofHash, _getBuffer(proof[x].right)]))) } else { proofHash = hashFunction(Buffer.concat([proofHash, _getBuffer(proof[x].right)])) }
      } else {
        return false
      }
    }

    return proofHash.toString('hex') === merkleRoot.toString('hex')
  }

  function _getBuffer (value) {
    if (value instanceof Buffer) {
      return value
    } else if (_isHex(value)) {
      return Buffer.from(value, 'hex')
    } else {
      throw new Error("Bad hex value - '" + value + "'")
    }
  }

  function _isHex (value) {
    var hexRegex = /^[0-9A-Fa-f]{2,}$/
    return hexRegex.test(value)
  }

  function _calculateNextLevel () {
    var nodes = []
    var topLevel = tree.levels[0]
    var topLevelCount = topLevel.length
    if (topLevelCount % 2 === 1) {
      topLevel.push(topLevel[topLevelCount - 1])
    }
    for (var x = 0; x < topLevelCount; x += 2) {
      nodes.push(hashFunction(Buffer.concat([topLevel[x], topLevel[x + 1]])))
    }
    return nodes
  }
}

module.exports = YBMerkleTree