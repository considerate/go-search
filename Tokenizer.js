/**
 * Created by Administrator on 07.04.2017.
 */
const readLine = require('readline');
const fs = require('fs')
const { List } = require('immutable');
const {Readable} = require('stream');

function createLineReader(stream){
    return readLine.createInterface({
        input: stream,
    });
}


function parseParameters(tokens) {
    console.error(':: parameters');
    expect(tokens, 'leftParen');
    let parameters = List([]);
    tokens = tokens.shift();
    try {
        [tokens, parameters] = parseParameterList(tokens);
        if(check(tokens, 'comma')) {
            tokens = tokens.shift();
        }
    } catch (e) {
        console.error(e);
    }
    console.error(':: rest of tokens', JSON.stringify(tokens));
    expect(tokens, 'rightParen');
    tokens = tokens.shift();
    return [tokens, parameters];
}

function parseParameterList(tokens) {
    let parameter;
    [tokens, parameter] = parseParameter(tokens);
    console.error('::paramter ', parameter)
    if(check(tokens, 'comma')) {
        tokens = tokens.shift();
        let parameters;
        [tokens, parameters] = parseParameterList(tokens);
        return [tokens, parameter.concat(parameters)];
    }
    return [tokens, parameter];
}

function parseIdentifier(tokens) {
    expect(tokens, 'identifier');
    const identifier = tokens.get(0).text;
    tokens = tokens.shift();
    return [tokens, identifier];
}

function parseParameter(tokens) {
    let identifiers = List([]);
    try {
        [tokens, identifiers] = parseIdentifierList(tokens);
    } catch (e) {
        //console.log(e);
    }
    let prefix = '';
    if(check(tokens, 'spread')) {
        prefix = '...';
        tokens = tokens.shift();
    }
    if(check(tokens,'rightParen') && identifiers.size > 0) {
        // No identifiers, list of types
        const params = identifiers.map(type => List(['var', type]));
        return [tokens, params];
    }
    let type;
    [tokens, type] = parseType(tokens);
    const params = identifiers.map(i => List([i, type]));
    return [tokens, params];
}

function parseType(tokens) {
    console.error(':: type');
    if(check(tokens, 'leftParen')) {
        tokens = tokens.shift();
        let type;
        [tokens, type] = parseType(tokens);
        expect(tokens, 'rightParen');
        tokens = tokens.shift();
        return [tokens, type];
    }
    if(check(tokens, 'star')) {
        const prefix = '*';
        let type;
        tokens = tokens.shift();
        [tokens, type] = parseType(tokens);
        return [tokens, prefix+type]
    }
    if(check(tokens, 'leftBracket')) {
        const prefix = '[]';
        let type;
        tokens = tokens.shift();
        expect(tokens, 'rightBracket');
        tokens = tokens.shift();
        [tokens, type] = parseType(tokens);
        return [tokens, prefix+type]
    }
    expect(tokens, 'identifier');
    const type = tokens.get(0).text;
    tokens = tokens.shift();
    return [tokens, type];
}

function parseIdentifierList(tokens) {
    expect(tokens, 'identifier');
    let id = tokens.get(0).text;
    let identifiers = List([]);
    tokens = tokens.shift();
    if(check(tokens, 'comma')) {
        tokens = tokens.shift();
        [tokens, identifiers] = parseIdentifierList(tokens);
    }
    identifiers = identifiers.unshift(id);
    return [tokens, identifiers];
}

function expect(tokens, typeName) {
    if(tokens.size == 0 || tokens.get(0).type != typeName) {
        throw new Error('Expected '+ typeName);
    }
}
function check(tokens, typeName) {
    if(tokens.size == 0 || tokens.get(0).type != typeName) {
        return false;
    }
    return true;
}

function parseResult(tokens) {
    console.error(':: result');
    try {
        return parseParameters(tokens);
    } catch (e) {
    }
    try {
        [tokens, type] = parseType(tokens);
        return [tokens, List(['var', type])];
    } catch (e) {
        return [tokens, List(['var', 'void'])];
    }
}

function parseTokens(tokens) {
    console.error(':: function');
    console.error(JSON.stringify(tokens));
    expect(tokens, 'identifier');
    if(tokens.get(0).text != 'func') {
        throw new Error('Not a function');
    }
    tokens = tokens.shift();
    try {
        console.error(':: method');
        // func (Receiver r) methodName(parameters) result
        [tokens2, receiver] = parseParameters(tokens);
        [tokens3, name] = parseIdentifier(tokens2);
        [tokens4, parameters] = parseParameters(tokens3);
        [tokens5, result] = parseResult(tokens4);
        return [tokens4, {
            object: receiver,
            name,
            parameters,
            result,
        }];
    } catch (e) {
    }
    try {
        console.error(':: named function');
        // func functionName(parameters) result
        [tokens2, name] = parseIdentifier(tokens);
        [tokens3, parameters] = parseParameters(tokens2);
        [tokens4, result] = parseResult(tokens3);
        return [tokens4, {
            name,
            parameters,
            result,
        }];
    } catch (e) {
    }
    try {
        console.error(':: anon function');
        // func (parameters) result
        [tokens2, parameters] = parseParameters(tokens);
        [tokens3, result] = parseResult(tokens2);
        return [tokens3, {
            parameters,
            result,
        }];
    } catch (e) {
        console.error(e);
    }
}

const matchers = {
    identifier: /\w(\w|\d|\.)*(\{\})?/y,
    star: /\*/y,
    leftParen: /\(/y,
    rightParen: /\)/y,
    leftBrace: /\{/y,
    rightBrace: /\}/y,
    leftBracket: /\[/y,
    rightBracket: /\]/y,
    comma: /,/y,
    space: /\s+/y,
    spread: /\.\.\./y,
    lineComment: /\/\//y,
};

function tokenizeFile(filename) {
    return tokenizeStream(fs.createReadStream(filename))
}
exports.tokenizeFile = tokenizeFile;

function tokenizeString(string) {
    const stream = new Readable();
    stream.push(string);
    stream.push(null);
    return tokenizeStream(stream)
}
exports.tokenizeString = tokenizeString;

function tokenizeStream(stream) {
    let tokens = [];
    let inMatch = false;
    return new Promise(function (resolve, reject) {
        const lineReader = createLineReader(stream);
        const signatures = [];
        lineReader.on('end', function () {
            resolve(List(signatures));
        });
        lineReader.on('close', function () {
            resolve(List(signatures));
        });
        lineReader.on('line', function (line) {
            const commentIndex = line.search(matchers.lineComment);
            if(commentIndex != -1) {
                line = line.substring(0, commentIndex);
            }
            let index = inMatch ? 0 : line.search(/func .*/);
            inMatch = (index != -1);
            if(!inMatch) {
                tokens = [];
                return;
            }

            let isToken = true;
            while(isToken) {
                isToken = false;
                Object.keys(matchers).forEach(function (matcher) {
                    const regex = matchers[matcher];
                    // start search at index
                    regex.lastIndex = index;
                    const match = regex.exec(line);

                    if (match !== null) {
                        if (matcher == 'space') {
                        } else if (matcher === 'leftBrace') {
                            const result = parseTokens(List(tokens));
                            if(result) {
                                const parseTree = result[1];
                                signatures.push(parseTree);
                            }
                            tokens = [];
                            inMatch = false;
                            isToken = false;
                            return;
                        } else {
                            tokens.push({
                                text: match[0],
                                type: matcher,
                            });
                            inMatch = true;
                        }
                        isToken = true;
                        index = regex.lastIndex;
                    }
                });

            }
            return;
        });
    });
}
