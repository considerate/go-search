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
    let parameter;
    [tokens, parameter] = parseParameter(tokens);
    if(check(tokens,'comma')) {
        tokens = tokens.shift();
        let parameters;
        [tokens, parameters] = parseParameterList(tokens);
        return [tokens, parameters.unshift(parameter)];
    }
    return [tokens, List(parameter)];
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
        const type = '('+identifiers.join(',')+')';
        return [tokens, [List(), type]];
    }
    let type;
    [tokens, type] = parseType(tokens);
    return [tokens, [identifiers, prefix+type]];
}

function parseType(tokens) {
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
    expect(tokens, 'identifier');
    if(tokens.get(0).text != 'func') {
        throw new Error('Not a function');
    }
    tokens = tokens.shift();
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
                console.log(e);
            }
        }
    }
}


(function tokenize() {
    let tokens = [];
    let inMatch = false;
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
    };
    lineReader.on('line', function (line) {
        let index = inMatch ? 0 : line.search(/func .*/);
        inMatch = (index != -1);
        if(!inMatch) {
            tokens = [];
            return;
        }
        console.log(line);
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
                            const ast = result[1];
                            console.log(ast);
                            console.log();
                        }
                        tokens = [];
                        inMatch = false;
                        return;
                    } else {
                        tokens.push({
                            text: match[0],
                            type: matcher,
                        });
                    }
                    isToken = true;
                    index = regex.lastIndex;
                }
            });
        }
        inMatch = false;
        tokens = [];
        return;
    });
})();
