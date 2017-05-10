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


const context = {
    results: [
    {
        "name": "read",
        "arguments": [["x", "int"], ["y", "double"], ["str", "string"]],
        "returns": ["string"],
		"objects" : [],
		"link" : "http://www.github.com"
    },
    {
        "name": "write",
        "arguments": [["offset", "int"], ["length", "double"]],
        "returns": [],
		"objects" : [],
		"link" : "http://www.github.com"
    }
    ]
};
app.get('/search', function(req, res) {
    const query = req.query.q;
    //TODO: replace mocked context with results from elasticsearch
	if(query) {
		if(false) {
		var output = []
		tokenizeString(query).then(function(result) {
			var func = JSON.stringify(result)
			var json = JSON.parse(func)


        const parameters = [{type: 'String', count: 1},{type: 'int', count: 1}];

        const parameterQueries = parameters.map(param => {
            return {
                nested: {
                    path: "parameters_info",
                    query: {
                        function_score: {
                            query: {
                                match: {"parameters_info.type": param.type},
                            },
                            gauss: {
                                "parameters_info.count": {
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
                    bool: {
                        should: parameterQueries.concat([{
                            terms: {"name_parts": (json[0].name_parts !== undefined ? json[0].name_parts : []), boost: 5}
                        }])
                    }
                }
            }
        }
        /*
        {
            index: 'gosearchindex',
                search_type: 'dfs_query_then_fetch',
            type: 'function',
            body: {
            query: {
                function_score: {
                    query: {
                        bool: {
                            should: parameterQueries/*([ {
                             //    terms: {"object": (json[0].object !== undefined ? json[0].object[0] : []), boost: 1}
                             //}, {
                             //    match: {"name": {query: (json[0].name !== undefined ? json[0].name : []), boost: 5}}
                             //}, {
                             //terms: {"name_parts": (json[0].name_parts !== undefined ? json[0].name_parts : []), boost: 5}
                             //}, {
                             //    terms: {"parameters": (json[0].parameters !== undefined ? json[0].parameters[0] : []), boost: 2}
                             //}, {
                             //    terms: {"result": (json[0].result !== undefined ? json[0].result[0] : []), boost: 2}
                             }])
                        }
                    },

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

                    //]
                }
            }
        }
        }*/

        client.search(query,function (error, response,status) {
            if (error){
                console.log("search error: "+error)
            }
            else {
                console.log("--- Response ---");
                console.log(response);
                console.log("--- Hits ---");
                response.hits.hits.forEach(function(hit){
                    console.log(JSON.stringify(hit));
                    output.push([hit._score + " " + hit._source.name])
                })
            }
        });
    })

    res.render('index', {
        results : [
            {
                "arguments": output
            }]
    });
});

app.listen(PORT, function () {
    console.log('Example app listening on port ' + PORT)
});
