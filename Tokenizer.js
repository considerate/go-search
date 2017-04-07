/**
 * Created by Administrator on 07.04.2017.
 */

const readLine = require('readline')
const fs = require('fs')
const filename = 'files/cover.go';


var lineReader = readLine.createInterface({
    input: fs.createReadStream(filename)
});

lineReader.on('line', function (line) {
    //console.log('Line from file:', line);
    const matchers = {
        identifier: /^\w(\w|\d|\.)*/,
        star: /^\*/,
        leftParen: /^\(/,
        rightParen: /^\)/,
        comma: /^,/,
        leftBrace: /^\{/,
        rightBrace: /^\}/,
        space: /^\s+/,
    };
    const match = line.match(/func .*/);

    if(match) {
        var signature = match[0].substring(5);
        console.log(signature);
        const tokens = [];
        while(signature.length > 0) {
            var isToken = false;
            Object.keys(matchers).forEach(function (matcher) {
                const match = signature.match(matchers[matcher]);
                if (match) {
                    if(matcher != 'space') {
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
            if(!isToken) {
                break;
            }
        }

        /*const nameMatch = signature.search(identifier, index);
        if(nameMatch != -1) {
            const name = signature.substring(index, index+nameMatch);
            console.log('Has name', name);
        }

        console.log(signature);*/
        console.log(tokens);
    }

});