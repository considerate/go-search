/**
 * Created by Max Landauer on 26.04.2017.
 */

// Create client
var elasticsearch = require('elasticsearch');
var client = new elasticsearch.Client({
    host: 'localhost:9200',
    log: 'trace'
});

const DELETE = true
const CREATE = true;
const ADD = false;

const doDelete = () => {
    return new Promise((resolve, reject) => {
        client.indices.delete({index: 'gosearchindex'},function(err,resp,status) {
            if(err) {
                reject(err);
            } else {
                resolve(resp);
            }
        });
    });
}

const doCreate = () => {
    return new Promise((resolve, reject) => {
        client.indices.create({
            index: 'gosearchindex',
            body: {
                mappings: {
                    function: {
                        properties: {
                            "object_info_types": {type: "nested"},
                            "result_info_types": {type: "nested"},
                            "parameters_info_types": {type: "nested"},
                        }
                    }
                }
            }
        },function(err,resp,status) {
            if(err) {
                reject(err);
            }
            else {
                resolve(resp);
            }
        });
    });
}

const doAdd = () => {

    const addOne = (body) => {
        return new Promise((resolve, reject) => {
            client.index({
                index: 'gosearchindex',
                type: 'function',
                body: body,
            },function(err,resp,status) {
                if(err) {
                    reject(err);
                } else {
                    resolve(resp);
                }
            });
        });
    }

    const docs = [{
        "name" : "paramTest1",
        "name_parts" : ["param", "test"],
        "parameters" : [["x", "int"]],
        "parameters_info" : {types: [{"type" : "int", "count" : 1}], total: 1},
        "result" : [["var", "void"]],
        "result_info" : {types: [{"type":"void","count":1}], total: 1},
        "uri" : "https:\/\/api.github.com\/paramTest1",
        "votes" : 4
    },{
        "name" : "paramTest2",
        "name_parts" : ["param", "test"],
        "parameters" : [["x", "int"], ["y", "int"]],
        "parameters_info" : {types: [{"type" : "int", "count" : 2}], total: 2},
        "result" : [["var", "void"]],
        "result_info" : {types: [{"type":"void","count":1}], total: 1},
        "uri" : "https:\/\/api.github.com\/paramTest2",
        "votes" : 4
    },{
        "name" : "paramTest3",
        "name_parts" : ["param", "test"],
        "parameters" : [["x", "int"], ["y", "int"], ["z", "int"]],
        "parameters_info" : {types: [{"type" : "int", "count" : 3}], total: 3},
        "result" : [["var", "void"]],
        "result_info" : {types: [{"type":"void","count":1}], total: 1},
        "uri" : "https:\/\/api.github.com\/paramTest3",
        "votes" : 4
    },{
        "object": [["s", "SortService"]],
        "object_info" : {types: [{"type":"SortService","count":1}], total: 1},
        "name" : "paramTest4",
        "name_parts" : ["param", "test"],
        "parameters" : [["x", "int"], ["y","int"], ["s", "String"]],
        "parameters_info" : {types: [{"type":"int","count":2},{"type":"String","count":1}], total: 3},
        "result" : [["var", "void"]],
        "result_info" : {types: [{"type":"void","count":1}], total: 1},
        "uri" : "https:\/\/api.github.com\/paramTest4",
        "votes" : 4
    }];

    const promises = docs.map(addOne);

    return Promise.all(promises);
}

const del = DELETE ? doDelete : Promise.resolve.bind(Promise);
const create = CREATE ? doCreate : Promise.resolve.bind(Promise);
const add = ADD ? doAdd : Promise.resolve.bind(Promise);

del().then(create).then(add);

