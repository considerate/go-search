const express = require('express');
const {tokenizeString} = require('./Tokenizer.js');
const app = express();

const PORT = process.env.PORT || 3000;
const PAGE_SIZE = process.env.PAGE_SIZE || 10;

var elasticsearch = require('elasticsearch');
var client = new elasticsearch.Client({
    host: 'localhost:9200',
    log: 'error'
});


// Set up view rendering using handlebars templates
app.use(express.static(__dirname + '/views'));
app.set('view engine', 'html');
app.set('view engine', 'hbs');

app.get('/search', function(req, res) {
    const queryString = req.query.q;
    if(!queryString) {
        return res.status(400);
    }

    let q = queryString;
    if (!/func/.test(queryString)) {
        q = 'func ' + q;
    }
    q = q + '{';

    tokenizeString(q)
    .then(function (json) {
        if(!json[0]) {
            return tokenizeString('func '+queryString+'() {');
        }
        return json;
    })
    .then(function(json) {

        const signature = json[0];
        if(signature.result_info) {
            signature.result_info.types = signature.result_info.types.filter(({type}) => type !== 'void');
        }
        console.log(JSON.stringify(signature, null, 2));

        const typeBoost = {
            object_info_types: 50,
        };


        const typeQueries = ['object_info_types', 'parameters_info_types', 'result_info_types'].filter(key => {
            return Boolean(signature[key]) && signature[key].length > 0;
        }).map(key => {
            const paramTypes = signature[key];
            return paramTypes.map((param) => {
                return {
                    nested: {
                        path: key,
                        query: {
                            function_score: {
                                boost: typeBoost[key],
                                query: {
                                    match: { [key + ".type"]: param.type, },
                                },
                                gauss: {
                                    [key + ".count"]: {
                                        origin: param.count,
                                        scale: 1,
                                    }
                                }
                            },
                        },
                    },
                };
            });
        })

        const totalQueries = ['object_info_total', 'parameters_info_total', 'result_info_total'].filter(key => {
            return Boolean(signature[key]);
        }).map(key => {
            const origin = signature[key];
            const gauss = {
            };
            gauss[key] = {
                origin,
                scale: 1,
            }
            return {
                function_score: {
                    gauss,
                }
            }
        });

        const nameQuery = ['name_parts'].filter(key => {
            return Boolean(signature[key]);
        }).map(key => {
            return {
                terms: {
                    "name_parts": signature.name_parts,
                    boost: 5,
                }
            };
        })

        const flatten = (xss) => {
            let result = [];
            xss.forEach(xs => {
                xs.forEach(x => {
                    result.push(x);
                })
            })
            return result;
        }

        const bool = {
            should: flatten(typeQueries).concat(totalQueries, nameQuery),
        };

        const query = {
            index: 'gosearchindex',
            search_type: 'dfs_query_then_fetch',
            type: 'function',
            body: {
                from: 0,
                size: PAGE_SIZE,
                query: {
                    function_score: {
                        query: {
                            bool,
                        },
                        field_value_factor: {
                            "field":    "stars",
                            "modifier": "log1p",
                            "factor":   1,
                        }
                    }
                }
            }
        };

        console.log(JSON.stringify(bool, null, 2));

        client.search(query, function (error, response, status) {
            if (error) {
                console.log("search error: " + error)
            }
            else {
                console.log("--- Hits ---");
                response.hits.hits.forEach(function (hit) {
                    console.log(JSON.stringify(hit, null, 2));
                })
                res.end(JSON.stringify({results: response.hits.hits.map(hit => {
                    let value = hit._source;
                    if(value.result) {
                        value.result = value.result.filter(([name, type]) => type !== 'void');
                    }
                    return value;
                })}));
            }
        });
    });
});

// Set up view rendering using handlebars templates
app.use(express.static(__dirname + '/views'));
app.set('view engine', 'html');
app.set('view engine', 'hbs');

app.listen(PORT, function () {
    console.log('Example app listening on port ' + PORT)
});
