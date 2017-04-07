/**
 * Created by Administrator on 07.04.2017.
 */

const readLine = require('readline')
const fs = require('fs')
const filename = 'files/cover.go';
const { List } = require('immutable')


var lineReader = readLine.createInterface({
    input: fs.createReadStream(filename)
});

function parseParameters(tokens) {
    expect(tokens, 'leftParen');
    let parameters = List([]);
    tokens = tokens.shift();
    try {
        [tokens, parameters] = parseParameterList(tokens);
        if(check(tokens, 'comma')) {
            tokens = tokens.shift();
        }
    } catch (e) {
    }
    expect(tokens, 'rightParen');
    tokens = tokens.shift();
    return [tokens, parameters];
}

function parseParameterList(tokens) {
    let parameters = List([]);
    [tokens, parameter] = parseParameter(tokens);
    if(check(tokens,'comma')) {
        tokens = tokens.shift();
        [tokens, parameters] = parseParameterList(tokens);
        return [tokens, parameters.unshift(parameter)];
    }
    return [tokens, parameters.unshift(parameter)];
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
    [tokens, type] = parseType(tokens);
    return [tokens, [identifiers, prefix+type]];
}

function parseType(tokens) {
    if(check(tokens, 'leftParen')) {
        tokens = tokens.shift();
        [tokens, type] = parseType(tokens);
        expect(tokens, 'rightParen');
        tokens = tokens.shift();
        return [tokens, type];
    }
    else {
        let prefix = '';
        if(check(tokens, 'star')) {
           prefix = '*';
           tokens = tokens.shift();
        }
        expect(tokens, 'identifier');
        const type = tokens.get(0).text;
        tokens = tokens.shift();
        return [tokens, prefix+type];
    }
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
    if(tokens.length == 0 || tokens.get(0).type != typeName) {
        throw new Error('Expected '+ typeName);
    }
}
function check(tokens, typeName) {
    if(tokens.length == 0 || tokens.get(0).type != typeName) {
        return false;
    }
    return true;
}

function parseResult(tokens) {
    try {
        return parseParameters(tokens);
    } catch (e) {
        try {
            return parseType(tokens);
        } catch (e) {
            return [tokens, 'void'];
        }
    }
}

function parseTokens(tokens) {
    try {
        [tokens2, receiver] = parseParameters(tokens);
        [tokens3, name] = parseIdentifier(tokens2);
        [tokens4, parameters] = parseParameters(tokens3);
        [tokens5, type] = parseResult(tokens4);
        return [tokens4, {
            object: receiver,
            name,
            parameters,
            type,
        }];
    } catch (e) {
        try {
            [tokens2, name] = parseIdentifier(tokens);
            [tokens3, parameters] = parseParameters(tokens2);
            [tokens4, type] = parseResult(tokens3);
            return [tokens4, {
                name,
                parameters,
                type,
            }];
        } catch (e) {
            try {
                [tokens2, parameters] = parseParameters(tokens);
                [tokens3, type] = parseResult(tokens2);
                return [tokens3, {
                    parameters,
                    type,
                }];
            } catch (e) {
                //console.log(e);
            }
        }
    }
}


(function tokenize() {
    let tokens = [];
    lineReader.on('line', function (line) {
        //console.log('Line from file:', line);
        const matchers = {
            identifier: /^(\[\]\s*)?\w(\w|\d|\.)*(\{\})?/,
            star: /^\*/,
            leftParen: /^\(/,
            rightParen: /^\)/,
            comma: /^,/,
            leftBrace: /^\{/,
            rightBrace: /^\}/,
            space: /^\s+/,
            spread: /^\.\.\./,
        };
        const match = line.match(/func .*/);

        if (match) {
            var signature = match[0].substring(5);
            console.log(signature);
            while (signature.length > 0) {
                var isToken = false;
                Object.keys(matchers).forEach(function (matcher) {
                    const match = signature.match(matchers[matcher]);
                    if (match) {
                        if (matcher == 'space') {
                        }
                        else if (matcher == 'leftBrace') {
                            //console.log(tokens);
                            const result = parseTokens(List(tokens));
                            if(result) {
                                const ast = result[1];
                                console.log(ast);
                            }
                            tokens = [];
                            return;
                        } else {
                            tokens.push({
                                text: match[0],
                                type: matcher,
                            });
                        }
                        isToken = true;
                        signature = signature.substring(match[0].length);
                        //console.log(signature);
                    }
                });
                if (!isToken) {
                    tokens = [];
                    return;
                }
            }

            /*const nameMatch = signature.search(identifier, index);
             if(nameMatch != -1) {
             const name = signature.substring(index, index+nameMatch);
             console.log('Has name', name);
             }

             console.log(signature);*/

        }

    });
})();