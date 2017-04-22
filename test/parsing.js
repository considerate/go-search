const {tokenizeString} = require('../Tokenizer.js');

const sig = 'func getNumberOfFilesInDir(path string)(count int){'

console.log(tokenizeString(sig));

