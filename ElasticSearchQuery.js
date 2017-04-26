/**
 * Created by Max Landauer on 26.04.2017.
 */

// Create client
var elasticsearch = require('elasticsearch');
var client = new elasticsearch.Client({
    host: 'localhost:9200',
    log: 'trace'
});

// Create index
client.indices.create({
    index: 'gosearchindex'
},function(err,resp,status) {
    if(err) {
        console.log(err);
    }
    else {
        console.log("create",resp);
    }
});

// Add documents to index
client.index({
    index: 'gosearchindex',
    id: '1',
    type: 'function',
    body: {
        "object": [["s", "SortService"]],
        "name" : "quickSort1",
        "parameters" : [["x", "int"], ["y", "int"]],
        "result" : [["first", "int"], ["second", "int"]],
        "uri" : "https:\/\/api.github.com\/quickSort",
        "votes" : 7
    }
},function(err,resp,status) {
    console.log(resp);
});

client.index({
    index: 'gosearchindex',
    id: '2',
    type: 'function',
    body: {
        "object": [["s", "SortService"]],
        "name" : "bogoSort",
        "parameters" : [["x", "int"], ["y", "int"]],
        "result" : [["first", "int"], ["second", "int"]],
        "uri" : "https:\/\/api.github.com\/bogoSort",
        "votes" : 1
    }
},function(err,resp,status) {
    console.log(resp);
});

client.index({
    index: 'gosearchindex',
    id: '3',
    type: 'function',
    body: {
        "object": [["s", "SortService"]],
        "name" : "quickSort2",
        "parameters" : [["x", "int"], ["y", "int"], ["z", "int"]],
        "result" : [["first", "int"], ["second", "int"], [["third", "int"]]],
        "uri" : "https:\/\/api.github.com\/quickSort",
        "votes" : 5
    }
},function(err,resp,status) {
    console.log(resp);
});

client.index({
    index: 'gosearchindex',
    id: '4',
    type: 'function',
    body: {
        "object": [["s", "SortService"]],
        "name" : "wordSort",
        "parameters" : [["x", "String"], ["y", "String"]],
        "result" : [["first", "String"], ["second", "String"]],
        "uri" : "https:\/\/api.github.com\/wordSort",
        "votes" : 3
    }
},function(err,resp,status) {
    console.log(resp);
});

client.index({
    index: 'gosearchindex',
    id: '5',
    type: 'function',
    body: {
        "object": [["s", "SortService"]],
        "name" : "mixedSort",
        "parameters" : [["x", "int"], ["y", "int"], ["z", "String"]],
        "result" : [["first", "object"], ["second", "object"], ["third", "object"]],
        "uri" : "https:\/\/api.github.com\/mixedSort",
        "votes" : 4
    }
},function(err,resp,status) {
    console.log(resp);
});

// Query index
/*
Current scores for query "quickSort(int, int) int":
 - quickSort1: 2.143373
 - quickSort2: 2.0301213
 - bogoSort: 1.7214293
 - mixedSort: 1.0511965
 - wordSort: 0
 */
client.search({
    index: 'gosearchindex',
    type: 'function',
    body: {
        query: {
            function_score: {
                query: {
                    bool: {
                        should: [{
                            terms: {"object": [], boost: 1}
                        }, {
                            match: {"name": {query: "quickSort*", boost: 5}}
                        }, {
                            terms: {"parameters": ["int", "int"], boost: 2}
                        }, {
                            terms: {"result": ["int"], boost: 2}
                        }]
                    }
                },
                field_value_factor: {
                    field: "votes",
                    modifier: "log1p"
                }
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

// Delete index
/*client.indices.delete({index: 'gosearchindex'},function(err,resp,status) {
    console.log("delete",resp);
});*/