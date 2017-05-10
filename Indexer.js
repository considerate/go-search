const {tokenizeFile} = require('./Tokenizer.js')
const walk = require('walk');
const filepath = './files';
const fspath = require('path');
const fs = require('fs');
const elasticsearch = require('elasticsearch');
const esClient = new elasticsearch.Client({
    host: 'localhost:9200',
    //log: 'trace'
    //log: 'error'
});

function tokenize(_, dirPath, dirs, files) {
    return Promise.all(files.map(tokenizeFile));
}

function walkFiles(filepath, repo_info) {
    const walker = walk.walk(filepath);

    return new Promise((resolve) => {
        let documents = {};
        walker.on('file', (directory, fileStats, next) => {
            const filename = fileStats.name;
            if (!filename.endsWith('.go')) {
                return next();
            }
            const path = [directory, filename].join('/');
            const relative = fspath.relative(filepath, path);
            // assume files are in folders
            const fileuri = repo_info.url + '/blob/master' + relative.substring(relative.indexOf('/'));
            tokenizeFile(path).then(result => {
                const withUrls = result.map(func => {
                    func.uri = fileuri;
                    func.watchers = repo_info.watchers;
                    func.forks = repo_info.forks;
                    return func;
                });
                documents[filename] = withUrls;
            }).catch(error => {
                console.log(error);
            })
            .then(() => next());
        });
        walker.on('errors', (root, nodeStatsArray, next) => {
            console.log(root, nodeStatsArray);
            // ignore error and continue
            next();
        });
        walker.on('end', () => {
            resolve(documents);
        });
    });
}

const readFile = (file) => new Promise((resolve, reject) =>
     fs.readFile(file, (err, data) => err ? reject(err) : resolve(data)));

const readDir = (dir) => new Promise((resolve, reject) =>
     fs.readdir(dir, (err, files) => err ? reject(err) : resolve(files)));

const readJson = (file) => readFile(file).then(JSON.parse);
const mergeObjects = (objects) => {
    // add to beginning of array
    objects.unshift({});
    const thisPointer = null;
    return Object.assign.apply(thisPointer, objects);
};

const addBase = (base) => (file) => [base, file].join('/');


/**
 * Put a tokenized file into the index
 */
const indexTokenizedFiles = (files) => {
    return Promise.all(Object.keys(files).map((filename) => {
        const posts = files[filename]; // posts are the tokenized functions
        if(posts.length === 0) {
            return Promise.resolve();
        }
        let ops = [];
        posts.forEach(post => {
            //TODO: think of an _id to use
            const id = undefined;
            ops.push({index: {_index: 'gosearchindex', _type: 'function'}});
            ops.push(post);
            console.log(post);
        });
        return new Promise((resolve) => {
            esClient.bulk({
                body: ops
            }, (err, response) => {
                if(err) {
                    console.error(err);
                }
                resolve(response);
            });
        });
    }));
};

const sequence = (f, list) => {
    return list.reduce((prev, x) => {
        return prev.then(result => {
            return f(x).then(y => {
                result.push(y);
                return result;
            });
        });
    }, Promise.resolve([]));
}
/*
.then( (files) => {
                // This should maybe not be done here, as this
                // should rather return a promise that has read files
                // not inserted to index yet
                // but as writted below, I get too many files open error
                // if waiting
                return indexTokenizedFiles(files);
*/
const documentsList = (f) => readDir('./links').then(files => {
    const allLinks = Promise.all(files.map(addBase('./links')).map(readJson));
    return allLinks.then(mergeObjects)
    .then(links => {
        const ids = Object.keys(links);
        return sequence(id => {
            const directory = [filepath, id].join('/');
            const repo_info = links[id];
            return walkFiles(directory, repo_info).then(f);
        }, ids)
    });
});

documentsList(indexTokenizedFiles).then((result) => {});

const search = function search(index, body) {
    return client.search({index: index, body: body});
};
