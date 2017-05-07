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

/**
 * Put a tokenized file into the index
 */
const indexTokenizedFiles = (files) => {
    return Promise.all( Object.keys(files).map((filename) => {
        const posts = files[filename]; // posts are the tokenized functions
        return Promise.all( posts.map( (post) => {
            return new Promise( (resolve, reject) => {
                post.votes = 4;
                console.log(post);
                esClient.index(
                    {index: 'gosearchindex',
                    type: 'function',
                    body: post,
                    },
                    (err, resp) => {} // Ignore if insert did not succeed
                );
                resolve();
            });
        }));
    }));
};


const documentsList = readDir('./links')
.then(files => {
    console.log(files);
    const allLinks = Promise.all(files.map(addBase('./links')).map(readJson));
    return allLinks.then(mergeObjects)
    .then(links => {
        const ids = Object.keys(links);
        return Promise.all(ids.map(id => {
            const directory = [filepath, id].join('/');
            const url = links[id];
            return walkFiles(directory, url).then( (files) => {
                // This should maybe not be done here, as this 
                // should rather return a promise that has read files
                // not inserted to index yet
                // but as writted below, I get too many files open error
                // if waiting
                return indexTokenizedFiles(files);
            });
        }));
    });
});

// When trying to do inserts this way, I get too many open files error
//documentsList.then( (tokenizedFilesList) => {
 //   return Promise.all(tokenizedFilesList.map( (tokenizedFiles) => {
  //      return indexTokenizedFiles(tokenizedFiles);
   // }));
//});


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
