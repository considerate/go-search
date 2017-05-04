/**
 * Created by Max Landauer on 26.04.2017.
 */

// Create client
var elasticsearch = require('elasticsearch');
var client = new elasticsearch.Client({
    host: 'localhost:9200',
    log: 'trace'
});

const CREATE = false;
const INSERT = false;
const SEARCH = true;
const DELETE = false;

// Create index
if(CREATE) {
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
}

// Add documents to index
if(INSERT) {
    client.index({
        index: 'gosearchindex',
        id: '1',
        type: 'function',
        body: {
            "object": [["s", "SortService"]],
            "object_info" : {"SortService" : 1},
            "name" : "quickSort1",
            "name_parts" : ["quick", "sort", "1"],
            "parameters" : [["x", "int"], ["y", "int"]],
            "parameters_info" : {"int" : 2},
            "result" : [["first", "int"], ["second", "int"]],
            "result_info" : {"int" : 2},
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
            "object_info" : {"SortService" : 1},
            "name" : "bogoSort",
            "name_parts" : ["bogo", "sort"],
            "parameters" : [["x", "int"], ["y", "int"]],
            "parameters_info" : {"int" : 2},
            "result" : [["first", "int"], ["second", "int"]],
            "result_info" : {"int" : 2},
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
            "object_info" : {"SortService" : 1},
            "name" : "quickSort2",
            "name_parts" : ["quick", "sort", "2"],
            "parameters" : [["x", "int"], ["y", "int"], ["z", "int"]],
            "parameters_info" : {"int" : 3},
            "result" : [["first", "int"], ["second", "int"], [["third", "int"]]],
            "result_info" : {"int" : 3},
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
            "object_info" : {"SortService" : 1},
            "name" : "wordSort",
            "name_parts" : ["word", "sort"],
            "parameters" : [["x", "String"], ["y", "String"]],
            "parameters_info" : {"String" : 2},
            "result" : [["first", "String"], ["second", "String"]],
            "result_info" : {"String" : 2},
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
            "object_info" : {"SortService" : 1},
            "name" : "mixedSort",
            "name_parts" : ["mixed", "sort"],
            "parameters" : [["x", "int"], ["y", "int"], ["z", "String"]],
            "parameters_info" : {"int" : 2, "String" : 1},
            "result" : [["first", "object"], ["second", "object"], ["third", "object"]],
            "result_info" : {"object" : 3},
            "uri" : "https:\/\/api.github.com\/mixedSort",
            "votes" : 4
        }
    },function(err,resp,status) {
        console.log(resp);
    });
}

// Query index
 if(SEARCH) {
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
								match: {"name": {query: "sort", boost: 5}}
							}, {
								terms: {"name_parts": ["sort"], boost: 5}
							}, {
								terms: {"parameters": ["int", "int"], boost: 2}
							}, {
								terms: {"result": ["int"], boost: 2}
							}]
						}
					},
					functions: [
						{
							script_score: {
								script: {
                                    inline: "float p = 1; " +
                                    "try {" +
                                    "   p += (int) Math.abs(doc['parameters_info.int'][0] - 2);" +
                                    "} catch (Exception e) {" +
                                    "   p += 2" +
                                    "}" +
                                    //"int numberOfParams = doc['parameters'].values.size();" +
                                    "return 1 / Math.log(p + 1);"
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
}

// Delete index
if(DELETE) {
	client.indices.delete({index: 'gosearchindex'},function(err,resp,status) {
		console.log("delete",resp);
	});
}
