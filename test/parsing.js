const {tokenizeString} = require('../Tokenizer.js');

const log = console.log.bind(console);

const sig = 'func getNumberOfFilesInDir(path string)(count int){\r\nfunc (Rec r) read(path string) (bytes int){'

//tokenizeString(sig).then(JSON.stringify).then(log);

const sig2 = 'func (Rec r) read(path string, size int) (count, bytes int){'

//tokenizeString(sig2).then(JSON.stringify).then(log);

const sig3 = 'func fly(int) float {'

tokenizeString(sig3).then(JSON.stringify).then(log);

const sig4 = 'func (r *Response) Write(bytes []byte) (int, error) {';

tokenizeString(sig4).then(JSON.stringify).then(log);
