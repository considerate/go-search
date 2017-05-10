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
app.use(express.static(__dirname + '/views'));
app.set('view engine', 'html');
app.set('view engine', 'hbs');

app.get('/search', function(req, res) {
    const queryString = req.query.q;
	if(queryString) {

            tokenizeString(queryString).then(function (result) {
                var func = JSON.stringify(result)
                var json = JSON.parse(func)
                console.log(queryString, json)

        //scriptString = "int nonmatch = 0;"
        //scriptString += "for(element in doc['parameters_info.count'].values) {}"
        /*scriptString = "int nonmatch = 0;" +
            "int additionalObject = (int) doc['object_info.__sz'].value;"*/
        /*for (var key in json[0].object_info) {
            if (json[0].object_info.hasOwnProperty(key)) {
                scriptString +=
                    "try {" +
                    "   nonmatch += (int) Math.abs(doc['object_info." + key + "'][0] - " + json[0].object_info[key] + ");" +
                    "   additionalObject -= doc['object_info." + key + "'][0];" +
                    "} catch (Exception e) {" +
                    "   nonmatch += " + json[0].object_info[key] +
                    "}"
            }
        }/*
        scriptString += "int additionalParam = (int) doc['parameters_info.__sz'].value;"
        for (var key in json[0].parameters_info) {
            if (json[0].parameters_info.hasOwnProperty(key) && key != '__sz') {
                scriptString +=
                    "try {" +
                    "   nonmatch += (int) Math.abs(doc['parameters_info." + key + "'][0] - " + json[0].parameters_info[key] + ");" +
                    "   additionalParam -= doc['parameters_info." + key + "'][0];" +
                    "} catch (Exception e) {" +
                    "   nonmatch += " + json[0].parameters_info[key] +
                    "}"
            }
        }
        scriptString += "int additionalResult = (int) doc['result_info.__sz'].value;"
        for (var key in json[0].result_info) {
            if (json[0].result_info.hasOwnProperty(key) && key != '__sz') {
                scriptString +=
                    "try {" +
                    "   nonmatch += (int) Math.abs(doc['result_info." + key + "'][0] - " + json[0].result_info[key] + ");" +
                    "   additionalResult -= doc['result_info." + key + "'][0];" +
                    "} catch (Exception e) {" +
                    "   nonmatch += " + json[0].result_info[key] +
                    "}"
            }
        }*/
        //scriptString += "return 1 / Math.log(nonmatch + 2);"// + additionalObject + additionalParam + additionalResult);"

                if(!json[0]) {
                    return res.status(404);
                }
                const parameterQueries = json[0].parameters_info.types.map((param) => {
                    return {
                        nested: {
                            path: "parameters_info.types",
                            query: {
                                function_score: {
                                    query: {
                                        match: {"parameters_info.types.type": param.type},
                                    },
                                    gauss: {
                                        "parameters_info.types.count": {
                                            origin: param.count,
                                            scale: 1,
                                        }
                                    }
                                }
                            }
                        }
                    }
                });

                const query = {
                    index: 'gosearchindex',
                    search_type: 'dfs_query_then_fetch',
                    type: 'function',
                    body: {
                        query: {
                            function_score: {
                                query: {
                                    bool: {
                                        should: parameterQueries.concat([{
                                            terms: {
                                                "name_parts": (json[0].name_parts !== undefined ? json[0].name_parts : []),
                                                boost: 5
                                            }
                                        }]/*.concat([{

                                                    function_score: {
                                                        gauss: {
                                                            "parameters_info.total": {
                                                                origin: (json[0].parameters_info.total || 0),
                                                                scale: 1,
                                                            }
                                                        }
                                                    }

                                        }])*/)
                                    }
                                },
                                functions: [{
                                    field_value_factor: {
                                        field: "votes",
                                        modifier: "log1p"
                                    }
                                }]
                            }
                        }
                    }
                };

                    //functions: [
                    /*{
                     script_score: {
                     script: {
                     inline: scriptString
                     }
                     }
                     },
                    /*{
                     field_value_factor: {
                     field: "votes",
                     modifier: "log1p"
                     }
                     }

                client.search(query, function (error, response, status) {
                    if (error) {
                        console.log("search error: " + error)
                    }
                    else {
                        console.log("--- Response ---");
                        console.log(response);
                        console.log("--- Hits ---");
                        response.hits.hits.forEach(function (hit) {
                            console.log(JSON.stringify(hit));
                        })
                        console.log(response.hits.hits);
                        res.end(JSON.stringify({results: response.hits.hits.map(hit => hit._source)}));
                    }
                });

            });
        }
});

// Set up view rendering using handlebars templates
app.use(express.static(__dirname + '/views'));
app.set('view engine', 'html');
app.set('view engine', 'hbs');

});

app.listen(PORT, function () {
    console.log('Example app listening on port ' + PORT)
});
