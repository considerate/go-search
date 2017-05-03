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
/*client.index({
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
/*
client.index({
    index: 'gosearchindex',
    id: '2',
    type: 'function',
    body: {
        "object": [["s", "SortService"]],
        "object_info" : {"SortService" : "1"},
        "name" : "bogoSort",
        "name_parts" : ["bogo", "sort"],
        "parameters" : [["x", "int"], ["y", "int"]],
        "parameters_info" : {"int" : "2"},
        "result" : [["first", "int"], ["second", "int"]],
        "result_info" : {"int" : "2"},
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
        "object_info" : {"SortService" : "1"},
        "name" : "quickSort2",
        "name_parts" : ["quick", "sort", "2"],
        "parameters" : [["x", "int"], ["y", "int"], ["z", "int"]],
        "parameters_info" : {"int" : "3"},
        "result" : [["first", "int"], ["second", "int"], [["third", "int"]]],
        "result_info" : {"int" : "3"},
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
        "object_info" : {"SortService" : "1"},
        "name" : "wordSort",
        "name_parts" : ["word", "sort"],
        "parameters" : [["x", "String"], ["y", "String"]],
        "parameters_info" : {"String" : "2"},
        "result" : [["first", "String"], ["second", "String"]],
        "result_info" : {"String" : "2"},
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
        "object_info" : {"SortService" : "1"},
        "name" : "mixedSort",
        "name_parts" : ["mixed", "sort"],
        "parameters" : [["x", "int"], ["y", "int"], ["z", "String"]],
        "parameters_info" : {"int" : "2", "String" : 1},
        "result" : [["first", "object"], ["second", "object"], ["third", "object"]],
        "result_info" : {"object" : "3"},
        "uri" : "https:\/\/api.github.com\/mixedSort",
        "votes" : 4
    }
},function(err,resp,status) {
    console.log(resp);
});*/

// Query index
/*
Current scores for query "quickSort(int, int) int":
 - quickSort1: 2.143373
 - quickSort2: 2.0301213
 - bogoSort: 1.7214293
 - mixedSort: 1.0511965
 - wordSort: 0
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
								//terms: {"object_info" : {}, boost : 1}
							//}, {
								match: {"name": {query: "sort", boost: 5}}
							}, {
								terms: {"name_parts": ["sort"], boost: 5}
							}, {
								terms: {"parameters": ["int", "int"], boost: 2}
							//}, {
							//    terms: {"parameters_info": {"int" : "2"}, boost: 2}
							}, {
								terms: {"result": ["int"], boost: 2}
							//}, {
							//    terms: {"result_info": {"int" : "1"}, boost: 2}
							}]
						}
					},
					functions: [
						{
							script_score: {
								/*"parameters_info['int']": {
									"origin": "2",
									"scale": "1",
									"decay": 0.999
								}*/
								//lang: "javascript",
								/*script:     {
										lang: "javascript",
										inline: "let p = 0; " +
										//"for(key in parameters_info) {" +
									//           "Object.keys(parameters_info).forEach(key => {" +
									//"                                                   if(doc[key] !== undefined) {" +
									//"                                                       ++p;" +
									//"                                                   }" +
									//"                                               }" +
									"return p;"
								}*/
								script: {
									inline: "int p = 0; " +
											//"for(int i = 0; i < doc['parameters_info.int'].length; i++) {" +
											//"   p++;" +
											//"}" +
											//"if(doc['parameters_info.float'] == true) ++p" +
											"try {" +
											"p = (int) doc['parameters_info.float'][0];" +
											"} catch (Exception e) {}" +
											"return p;"
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
>>>>>>> 32d9e3d53d5671445dd94944878f22c80b4e7ea8
