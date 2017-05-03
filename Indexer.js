const {tokenizeFile} = require('./Tokenizer.js')
const walk = require('walk');
const filepath = './files';
const fspath = require('path');
const fs = require('fs');
const elasticsearch = require('elasticsearch');
const esClient = new elasticsearch.Client({
			host: 'localhost:9200',
			//log: 'trace'
			log: 'error'
		});

function tokenize(_, dirPath, dirs, files) {
    return Promise.all(files.map(tokenizeFile));
}

function walkFiles(filepath, url) {
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
            const fileuri = url + relative.substring(relative.indexOf('/'));
            tokenizeFile(path).then(result => {
                const withUrls = result.map(func => {
                    func.uri = fileuri;
                    return func;
                });
                documents[filename] = withUrls;
                //console.log(JSON.stringify(withUrls));
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

readDir('./links')
.then(files => {
    console.log(files);
    const allLinks = Promise.all(files.map(addBase('./links')).map(readJson));
    return allLinks.then(mergeObjects)
    .then(links => {
        const ids = Object.keys(links);
        return Promise.all(ids.map(id => {
            const directory = [filepath, id].join('/');
            const url = links[id];
			const processed = walkFiles(directory, url);
			processed.then(
				data => {
					for(var key in data) {
						console.log("*File: " + key);
						for(var i = 0; i < data[key].size; ++i) {
							let post = data[key].get(i);
							//console.log(post);
							post.votes = 4;
							esClient.index({index: 'gosearchindex', 
											type: 'function', 
											body: post
											},
											(err, resp) => {  }
											);
							console.log("	" + data[key].get(i).name + ": " + data[key].get(i).parameters + " / " + data[key].get(i).result + " @ " + data[key].get(i).uri);
						}
					}
				}
			);
            //return 
        }));
    });
});

const search = function search(index, body) {
    return client.search({index: index, body: body});
};

/*

function searchIndex() {
    let body = {
        size: 20,
        from: 0,
        query: {
            match_all: {}
        }
    };

    search('gosearch', body)
        .then(results => {
            console.log(`found ${results.hits.total} items in ${results.took}ms:`);
            results.hits.hits.forEach(
                (hit, index) => console.log(
                    `\t${body.from + ++index} - ${hit._source.name} (${hit._source.parameters}) returns ${hit._source.type}`
                )
            )
        })
        .catch(console.error);
};

searchIndex();
*/
