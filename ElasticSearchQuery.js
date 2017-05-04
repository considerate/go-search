/**
 * Created by Max Landauer on 26.04.2017.
 */

// Create client
var elasticsearch = require('elasticsearch');
var client = new elasticsearch.Client({
    host: 'localhost:9200',
    log: 'trace'
});

const DELETE = false;
const SEARCH = true;
const ADD = false;

if(ADD) {
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
			"object_info" : {"__sz" : 1, "SortService" : 1},
			"name" : "quickSort1",
			"name_parts" : ["quick", "sort", "1"],
			"parameters" : [["x", "int"], ["y", "int"]],
			"parameters_info" : {"__sz" : 2, "int" : 2},
			"result" : [["first", "int"], ["second", "int"]],
			"result_info" : {"__sz" : 2, "int" : 2},
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
			"object_info" : {"__sz": 1, "SortService" : 1},
			"name" : "bogoSort",
			"name_parts" : ["bogo", "sort"],
			"parameters" : [["x", "int"], ["y", "int"]],
			"parameters_info" : {"__sz": 2, "int" : 2},
			"result" : [["first", "int"], ["second", "int"]],
			"result_info" : {"__sz": 2, "int" : 2},
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
			"object_info" : {"__sz": 1, "SortService" : 1},
			"name" : "quickSort2",
			"name_parts" : ["quick", "sort", "2"],
			"parameters" : [["x", "int"], ["y", "int"], ["z", "int"]],
			"parameters_info" : {"__sz": 3, "int" : 3},
			"result" : [["first", "int"], ["second", "int"], [["third", "int"]]],
			"result_info" : {"__sz" : 3, "int" : 3},
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
			"object_info" : {"__sz" : 1, "SortService" : 1},
			"name" : "wordSort",
			"name_parts" : ["word", "sort"],
			"parameters" : [["x", "String"], ["y", "String"]],
			"parameters_info" : {"__sz" : 2, "String" : 2},
			"result" : [["first", "String"], ["second", "String"]],
			"result_info" : {"__sz" : 2, "String" : "2"},
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
			"object_info" : {"__sz" : 1, "SortService" : 1},
			"name" : "mixedSort",
			"name_parts" : ["mixed", "sort"],
			"parameters" : [["x", "int"], ["y", "int"], ["z", "String"]],
			"parameters_info" : {"__sz" : 3, "int" : 2, "String" : 1},
			"result" : [["first", "object"], ["second", "object"], ["third", "object"]],
			"result_info" : {"__sz" : 3, "object" : 3},
			"uri" : "https:\/\/api.github.com\/mixedSort",
			"votes" : 4
		}
	},function(err,resp,status) {
		console.log(resp);
	});
}

// Query index
/*
    The script sums up the discrepancies between the query and a doc. Logarithm is used to dampen the effect when
    large number of parameters are different. This score is inverted in order to get a similarity score. +2 is used
    to avoid division by 0.
    Sample cases for parameter matching:
     - Identical amount of parameters:
        Query for {int: 1, String: 1} when doc is {int: 1, String: 1}
        Result: nonmatch = 0, additional = 0, returns 1/log(0+0+2) = 3.3
     - Different amount of parameters:
        Query for {int: 2, String: 1} when doc is {int: 1, String: 1}
        Result: nonmatch = 1, additional = 0, returns 1/log(1+0+2) = 2.1
     - Query has more parameters than doc:
        Query for {int: 1, String: 1, float: 1} when doc is {int: 1, String: 1}
        Result: nonmatch = 1 (increased in catch), additional = 0, returns 1/log(1+0+2) = 2.1
     - Query has less parameters than doc:
        Query for {int: 1} when doc is {int: 1, String: 1}
        Result: nonmatch = 0, additional = 1, returns 1/log(1+0+2) = 2.1
 */
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
									inline: "int nonmatch = 0;" +
											"int additional = (int) doc['parameters_info.__sz'].value;" +
                                            "try {" +
                                            "   nonmatch += (int) Math.abs(doc['parameters_info.int'][0] - 2);" +
                                            "   additional -= doc['parameters_info.int'][0];" +
                                            "} catch (Exception e) {" +
                                            "   nonmatch += 2" +
                                            "}" +
											"return 1 / Math.log(nonmatch + additional + 2);"
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
