/**
 * A spider for fetching github repositories 
 * Author: Marcus Larson <marcus.larson@live.com>
 * Date: 8 April 2017
 */
const request  = require('request');
const URL  = require('url-parse');
const parse  = require('parse-link-header');
const wget = require('node-wget');
const fs = require('fs');
const unzip = require('unzip');
const HashMap = require('hashmap');

const language = 'go';
const languageFile = '.go';
const startURL = 'https://api.github.com/search/repositories?q=language:'+language+'&page=33';
// WARNING: github has i request limit. 10 per minute if unauthorized and 30 authorized. 
// For this case there are 34 pages in total, so only fetching the three last for now
const filesPath = 'files/';

/**
 * Unzip a repository zip file. Only unzipping the relevant language files and directories
 * will resolve in the foldername of the unzipped file
 */
function unzipRepo(zipFile){
    if(!zipFile) {
        return Promise.resolve();
    }
    return new Promise(function(resolve, reject) {
        console.error('Unzipping repo: ' + zipFile);
        let dirPath = zipFile.substring(0,zipFile.length - 4);
        try{
            fs.mkdirSync(dirPath);
        }catch (e){
            return resolve(); //skip repo
        }
        fs.createReadStream(zipFile)
            .pipe(unzip.Parse())
            .on('error', function(error) {
                console.error(error);
                return resolve();
             })
            .on('entry', function (entry) {
                var fileName = dirPath + '/' + entry.path;
                var type = entry.type; // 'Directory' or 'File' 
                if (type === 'Directory'){
                    try{
                        fs.mkdirSync(fileName);
                    } catch (e){
                        //do nothing
                    }
                }
                if (fileName.endsWith(languageFile)) {
                    entry.pipe(fs.createWriteStream(fileName))
                        .on('error', function(error) {
                            console.error(error);
                        });
                } else {
                    entry.autodrain();
                }
            })
            .on('finish', function() {
                fs.unlink(zipFile);
                return resolve();
            });
    });
}

/**
 * Download a repository.
 * repo.url String, the url to the repository
 * repo.id  Number, github id of the repository
 * returns a promise that resolves in the relative pathname of the file that was downloaded.
 */
function fetchRepo(repo) {
    return new Promise( function(resolve, reject) {

        let url = new URL(repo.url);
        // remove word "repos/" in url with substring
        let fetchURL = 'https://github.com/'+url.pathname.substring(7)+'/archive/master.zip'
        let zipFile = filesPath + repo.id + '.zip';
        let repoPath = filesPath + repo.id;
        if(fs.existsSync(repoPath)){
            // dont download repo if unzipped version already exists
            return resolve();
        }
        wget({
            url: fetchURL,
            dest: zipFile,
            },
            function(err, data) {
                if(err){
                    return reject(err);
                }
                return resolve(zipFile);
            }
        );
    });
}

/**
 * Fetch all repositories for the github query.
 * url: String the github api query link
 * options.headers needs  a 'User-Agent'
 * returns a promise that resolves the result list and a nextlink if existing
 */
function fetchRepositories(url, options){
    return new Promise(function(resolve, reject) {
        const opts = Object.assign({}, options, {url});
        console.log(opts);
        request(opts, function(error, response, body){
            if(error) {
                return reject(error);
            }
            console.error('Fetching repolist: ' + url);
            if (response.statusCode !== 200){
                return reject(new Error('Invalid status code' + response.statusCode));
            }
            res = JSON.parse(body);
            // Go to next batch of repositories
            let nextLink = parse(response.headers.link);
            if(nextLink.next){
                return resolve({
                    repos: res.items,
                    next: nextLink.next.url,
                });
            } else {
                return resolve({
                    repos: res.items,
                });
            }
        });
    });
}

/**
 * Download all repositories form github for the given language.
 */
function run(language){
    // WARNING: github has i request limit. 10 per minute if unauthorized and 30 authorized. 
    let options = {
        url: startURL,
        headers: {
            'User-Agent': 'request'
        }
    };

    // Create the file path if not already existing
    try{
        fs.mkdirSync(filesPath);
    } catch(e) {
    }

    // extract the relevant info from repo object
    function getUrlMaps(repos) {
        return repos.map(repo => [repo.id, repo.url]);
    }

    // Fetch all repositories recursively
    function fetchAll(url) {
        return fetchRepositories(url, options)
        .then(({repos,next}) => {
            const getFiles = Promise.all(repos.map(function(repo) {
                return fetchRepo(repo).then(unzipRepo);
            }));
            if(next){
                // wait until first page is done before processing next
                return getFiles.then((files) => {
                    return fetchAll(next)
                    .then(nextMaps => {
                       return getUrlMaps(repos).concat(nextMaps);
                    })
                });
            }
            return getFiles.then(() => {
                return getUrlMaps(repos);
            });
        });
    }
    return fetchAll(startURL)
}

run(language).then((urlMaps) => {
    // TODO: This map needs to be printed to file for the indexer
    console.log(urlMaps);
    console.error('DONE');
})
.catch((error) => console.error(error));

