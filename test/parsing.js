const {tokenizeString} = require('../Tokenizer.js');

const log = console.log.bind(console);

const sig = 'func getNumberOfFilesInDir(path string)(count int){'

tokenizeString(sig).then(JSON.stringify).then(log);

const sig2 = 'func (Rec r) read(path string, size int) (count, bytes int){'

tokenizeString(sig2).then(JSON.stringify).then(log);

const sig3 = 'func (int) float {'

tokenizeString(sig3).then(JSON.stringify).then(log);
