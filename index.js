const express = require('express');
const {tokenizeString} = require('./Tokenizer.js');
const app = express();

const PORT = process.env.PORT || 3000;

var elasticsearch = require('elasticsearch');
var client = new elasticsearch.Client({
    host: 'localhost:9200',
    log: 'trace'
});

// Set up view rendering using handlebars templates
app.set('view engine', 'html');
app.set('view engine', 'hbs');
app.set('views', __dirname + '/views')

const context = {
    results: [
    {
        "name": "read",
        "arguments": [["x", "int"], ["y", "double"], ["str", "string"]],
        "returns": "string"
    },
    {
        "name": "write",
        "arguments": [["offset", "int"], ["length", "double"]],
        "returns": ""
    },
    ],
};
app.get('/', function(req, res) {
    const query = req.query.q;
    //TODO: replace mocked context with results from elasticsearch
    tokenizeString(query).then(function(result) {
        var func = JSON.stringify(result)
        var json = JSON.parse(func)

        var scriptString = "int nonmatch = 0;" +
            "int additional = (int) doc['parameters_info.__sz'].value;"
        for (var key in json[0].object_info) {
            if (json[0].object_info.hasOwnProperty(key) && key != '__sz') {
                scriptString +=
                    "try {" +
                    "   nonmatch += (int) Math.abs(doc['parameters_info." + key + "'][0] - " + json[0].object_info[key] + ");" +
                    "   additional -= doc['parameters_info." + key + "'][0];" +
                    "} catch (Exception e) {" +
                    "   nonmatch += " + json[0].object_info[key] +
                    "}"
            }
        }
        for (var key in json[0].parameters_info) {
            if (json[0].parameters_info.hasOwnProperty(key) && key != '__sz') {
                scriptString +=
                    "try {" +
                    "   nonmatch += (int) Math.abs(doc['parameters_info." + key + "'][0] - " + json[0].parameters_info[key] + ");" +
                    "   additional -= doc['parameters_info." + key + "'][0];" +
                    "} catch (Exception e) {" +
                    "   nonmatch += " + json[0].parameters_info[key] +
                    "}"
            }
        }
        for (var key in json[0].result_info) {
            if (json[0].result_info.hasOwnProperty(key) && key != '__sz') {
                scriptString +=
                    "try {" +
                    "   nonmatch += (int) Math.abs(doc['parameters_info." + key + "'][0] - " + json[0].result_info[key] + ");" +
                    "   additional -= doc['parameters_info." + key + "'][0];" +
                    "} catch (Exception e) {" +
                    "   nonmatch += " + json[0].result_info[key] +
                    "}"
            }
        }
        scriptString += "return 1 / Math.log(nonmatch + additional + 2);"

        console.log(scriptString)

        client.search({
            index: 'gosearchindex',
            type: 'function',
            body: {
                query: {
                    function_score: {
                        query: {
                            bool: {
                                should: [{
                                //    terms: {"object": (json[0].object !== undefined ? json[0].object[0] : []), boost: 1}
                                //}, {
                                //    match: {"name": {query: (json[0].name !== undefined ? json[0].name : []), boost: 5}}
                                //}, {
                                    terms: {"name_parts": (json[0].name_parts !== undefined ? json[0].name_parts : []), boost: 5}
                                //}, {
                                //    terms: {"parameters": (json[0].parameters !== undefined ? json[0].parameters[0] : []), boost: 2}
                                //}, {
                                //    terms: {"result": (json[0].result !== undefined ? json[0].result[0] : []), boost: 2}
                                }]
                            }
                        },
                        functions: [
                            {
                                script_score: {
                                    script: {
                                        inline: scriptString
                                    }
                                }
                            },
                            {
                                field_value_factor: {
                                    field: "votes",
                                    modifier: "log1p"
                                }
                            }
                        ]
                    }
                }
            }
        },function (error, response,status) {
            if (error){
                console.log("search error: "+error)
            }
            else {
                console.log("--- Response ---");
                console.log(response);
                console.log("--- Hits ---");
                response.hits.hits.forEach(function(hit){
                    console.log(hit);
                })
            }
        });
    })
    const results = context.results
        .filter(r => (r.name || '').indexOf(query) != -1);
    res.render('index', {
        results,
    });
});

app.listen(PORT, function () {
    console.log('Example app listening on port ' + PORT)
});
