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
        let q = queryString;
        if (!/func/.test(queryString)) {
            q = 'func ' + q;
        }
        q = q + '{';
        tokenizeString(q).then(function (json) {
            if(!json[0]) {
                return tokenizeString('func '+queryString+'() {');
            }
            return json;
        }).then(function(json) {
            console.log(json);
            const paramTypes = json[0].parameters_info && json[0].parameters_info.types || [];
            const parameterQueries = paramTypes.map((param) => {
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

            const resultTypes = json[0].result_info && json[0].result_info.types || [];
            const resultQueries = resultTypes.map((param) => {
                return {
                    nested: {
                        path: "result_info.types",
                        query: {
                            function_score: {
                                query: {
                                    match: {"result_info.types.type": param.type},
                                },
                                gauss: {
                                    "result_info.types.count": {
                                        origin: param.count,
                                        scale: 1,
                                    }
                                }
                            }
                        }
                    }
                });

            const receiverTypes = json[0].receiver_info && json[0].receiver_info.types || [];
            const receiverQueries = receiverTypes.map((param) => {
                return {
                    nested: {
                        path: "object_info.types",
                        query: {
                            function_score: {
                                query: {
                                    match: {"object_info.types.type": param.type},
                                },
                                gauss: {
                                    "object_info.types.count": {
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
                                    should: parameterQueries
                                        .concat(resultQueries)
                                        .concat(receiverQueries)
                                        .concat([{
                                            terms: {
                                                "name_parts": (json[0].name_parts || []),
                                                boost: 5
                                            }
                                        },
                                        {
                                            function_score: {
                                                gauss: {
                                                    "parameters_info.total": {
                                                        origin: (json[0].parameters_info.total || 0),
                                                        scale: 1,
                                                    }
                                                }
                                            },
                                            {
                                                function_score: {
                                                    gauss: {
                                                        "result_info.total": {
                                                            origin: (json[0].result_info.total || 0),
                                                            scale: 1,
                                                        }
                                                    }
                                                }
                                            }])
                                    }
                                }/*,
                                functions: [{
                                    field_value_factor: {
                                        field: "votes",
                                        modifier: "log1p"
                                    }
                                }]*/
                            }
                        }
                    }
                }
            };

            client.search(query, function (error, response, status) {
                if (error) {
                    console.log("search error: " + error)
                }
                else {
                    console.log("--- Hits ---");
                    response.hits.hits.forEach(function (hit) {
                        console.log(JSON.stringify(hit));
                    })
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
