/**
 * Created by Administrator on 07.04.2017.
 */
const readLine = require('readline');
const fs = require('fs')
const PRINTOUTS = false;

const { List } = require('immutable');
const {Readable} = require('stream');

function createLineReader(stream){
    return readLine.createInterface({
        input: stream,
    });
}

function parseParameters(tokens) {
    if(PRINTOUTS) console.error('    :: parameters');
    expect(tokens, 'leftParen');
    let parameters = List([]);
    tokens = tokens.shift();
    try {
        [tokens, parameters] = parseParameterList(tokens);
        if(check(tokens, 'comma')) {
            tokens = tokens.shift();
        }
    } catch (e) {
        //console.error(e);
    }
    if(PRINTOUTS) console.error('    :: rest of tokens', JSON.stringify(tokens));
    expect(tokens, 'rightParen');
    tokens = tokens.shift();
    return [tokens, parameters];
}

function parseParameterList(tokens) {
    let parameter;
    [tokens, parameter] = parseParameter(tokens);
    if(PRINTOUTS) console.error('    ::paramter ', parameter)
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
    if(identifier == 'func') {
        throw new Error('Trying to parse keyword func as identifier');
    }
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
    if(PRINTOUTS) console.error('    :: type');
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
    if(PRINTOUTS) console.error('    :: result');
    try {
        return parseParameters(tokens);
    } catch (e) {
    }
    try {
        [tokens, type] = parseType(tokens);
        return [tokens, List([List(['var', type])])];
    } catch (e) {
        return [tokens, List([List(['var', 'void'])])];
    }
}

function parseTokens(tokens) {
    if(PRINTOUTS) {
        console.error('    :: function');
        console.error(JSON.stringify(tokens));
    }
    expect(tokens, 'identifier');
    if(tokens.get(0).text != 'func') {
        throw new Error('Not a function');
    }
    tokens = tokens.shift(); // begins with an identifier and it is func, so it is a function declaration
    try { // trying to see if it is a function with receivers e.g. func (Receiver r) methodName(parameters) result
        if(PRINTOUTS) console.error('    :: method');
        [tokens2, receiver] = parseParameters(tokens);
        object_info = getTypeInfo(receiver);
        [tokens3, name] = parseIdentifier(tokens2);
        name_parts = getStringParts(name);
        [tokens4, parameters] = parseParameters(tokens3);
        parameters_info = getTypeInfo(parameters);
        [tokens5, result] = parseResult(tokens4);
        result_info = getTypeInfo(result);
        return [tokens4, {
            object: receiver.toJS(),
            object_info,
            name,
            name_parts: name_parts,
            parameters: parameters.toJS(),
            parameters_info,
            result: result.toJS(),
            result_info
        }];
    }
    catch (e) {
    }
    try {
        // trying to see if it is a function without receivers e.g. func functionName(parameters) result
        if(PRINTOUTS) console.error('    :: named function');
        [tokens2, name] = parseIdentifier(tokens);
        name_parts = getStringParts(name);
        [tokens3, parameters] = parseParameters(tokens2);
        parameters_info = getTypeInfo(parameters);
        [tokens4, result] = parseResult(tokens3);
        result_info = getTypeInfo(result);
        return [tokens4, {
            name,
            name_parts,
            parameters: parameters.toJS(),
            parameters_info,
            result: result.toJS(),
            result_info
        }];
    } catch (e) {
    }
    try {
        // trying to see if it is an anonymous function e.g. func (parameters) result
        if (PRINTOUTS) console.error('    :: anon function');
        [tokens2, parameters] = parseParameters(tokens);
        parameters_info = getTypeInfo(parameters);
        if (PRINTOUTS) console.log(parameters);
        [tokens3, result] = parseResult(tokens2);
        if(PRINTOUTS) console.error("Result: " + result);
        if(PRINTOUTS) console.error(result);
        result_info = getTypeInfo(result);
        return [tokens3, {
            parameters: parameters.toJS(),
            parameters_info,
            result: result.toJS(),
            result_info
        }];
    } catch (e) {
        // none of the above, interesting to see what it is!!!
        // console.error(e);
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
    lineComment: /\/\//g,
};

function tokenizeFile(filename) {
    if(PRINTOUTS) console.error("Tokenizing " + filename);
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

function getStringParts(name) {
    const parts = [];
    const camelCase = new RegExp('([A-Z]{2,}|[a-z][A-Z])', 'g');
    let index = 0;
    let found = false;
    do {
        found = false;
        let info = camelCase.exec(name);
        if(info !== null) {
            found = true;
            parts.push(name.substring(index, camelCase.lastIndex - 1).toLowerCase());
            index = camelCase.lastIndex - 1;

        }
    }
    while(found);
    parts.push(name.substr(index, name.length).toLowerCase());
    return parts;
}

/*
 * parameter list: List([List([name, type]),...])])
 * => {type: n, ...}
 * => [{type: type, count: n}, ...]
 */

function getTypeInfo(arr) {
    const typeCounts = arr.reduce((counts, param) => {
        const type = param.get(1);
        const before = Number(counts[type]) || 0;
        counts[type] = before + 1;
        return counts;
    }, {});
    const types = Object.keys(typeCounts).map(type => {
        return {
            type : type,
            count: typeCounts[type],
        };
    });
    const total = types.reduce((sum, param) => {
        return sum + param.count;
    }, 0);
    return {types, total};
}

function tokenizeStream(stream) {
    let tokens = [];
    let inMatch = false;
    return new Promise(function (resolve, reject) {
        const lineReader = createLineReader(stream);
        const signatures = [];
        lineReader.on('end', function () {
            resolve(signatures);
        });
        lineReader.on('close', function () {
            resolve(signatures);
        });
        lineReader.on('line', function (line) {
            // first make sure that we're not in a comment
            const commentIndex = line.search(matchers.lineComment);
            if(commentIndex != -1) {
                line = line.substring(0, commentIndex); // shorten the line up to where the comment begins
            }
            let index = inMatch ? 0 : line.search(/func\W*/);
            inMatch = (index != -1);
            if(!inMatch) { // no function in this line
                tokens = [];
                return;
            }

            // have a function signature on this line
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
                            // do nothing
                        }
                        else if (matcher === 'leftBrace') {
                            // found the end of this function declaration
                            if(PRINTOUTS) console.error("Found end of function declaration, parsing ...");
                            const result = parseTokens(List(tokens));
                            if(result) {
                                const parseTree = result[1];
                                signatures.push(parseTree);
                            }
                            tokens = [];
                            inMatch = false;
                            isToken = false;
                            return;
                        }
                        else {
                            // not the end of the function declaration, push an entry to the tokens array with the name of the match and the match itself
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
