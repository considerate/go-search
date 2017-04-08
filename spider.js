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
const startURL = 'https://api.github.com/search/repositories?q=language:'+language+'&page=32';
// WARNING: github has i request limit. 10 per minute if unauthorized and 30 authorized. 
// For this case there are 34 pages in total, so only fetching the three last for now
const filesPath = 'files/';

// Needed to later be able to derive the repository url
let nameURLmap = new HashMap();

/**
 * Fetch all repositories for the github query.
 * options.url is the github api query link
 * options.headers needs  a 'User-Agent'
 */
function fetchRepositories(options){
    request(options, function(error, response, body){
        console.log('Fetching repolist: ' + options.url);
        if (response.statusCode !== 200){
            console.log('failed');
            console.log(error);
        } else {
            res = JSON.parse(body);
            res.items.map(fetchRepo);
            // Go to next batch of repositories
            let nextLink = parse(response.headers.link);
            if(nextLink.next){
                options.url = nextLink.next.url;
                fetchRepositories(options);
            }
        }
    });
}

/**
 * Download a repository.
 * repo.url is the url to the repository
 * repo.id is github id of the repository
 */
function fetchRepo(repo){
    // clone repository then move to index queue when done
    nameURLmap.set(repo.id, repo.url);
    let url = new URL(repo.url);
    // remove word "repos/" in url with substring
    let fetchURL = 'https://github.com/'+url.pathname.substring(7)+'/archive/master.zip'
    let zipFile = filesPath + repo.id + '.zip';
    let repoPath = filesPath + repo.id;
    if(fs.existsSync(repoPath)){
        // dont download repo if unzipped version already exists
        return;
    }
    wget({
        url: fetchURL,
        dest: zipFile,
        },
        unzipRepo(zipFile)
    );
}


/**
 * Unzip a repository zip file. Only unzipping the relevant language files and directories
 */
function unzipRepo(zipFile){
    return function(err, data){
        console.log('Unzipping repo: ' + zipFile);
        if (err) throw err;
        let dirPath = zipFile.substring(0,zipFile.length - 4);
        fs.mkdirSync(dirPath);
        fs.createReadStream(zipFile)
          .pipe(unzip.Parse())
              .on('entry', function (entry) {
                  var fileName = dirPath + '/' + entry.path;
                  var type = entry.type; // 'Directory' or 'File' 
                  if (type === 'Directory'){
                      if (!fs.existsSync(fileName)){
                              fs.mkdirSync(fileName);
                      }
                  }
                  if (fileName.endsWith(languageFile)) {
                      entry.pipe(fs.createWriteStream(fileName));
                  } else {
                      entry.autodrain();
                  }
                });
        fs.unlink(zipFile);
    }
}


/**
 * Get a list of repository urls with code in the given language
 */
function run(language){
    // WARNING: github has i request limit. 10 per minute if unauthorized and 30 authorized. 
    let options = {
        url: startURL,
        headers: {
            'User-Agent': 'request'
        }
    };
    fetchRepositories(options);
    }

run(language);
//After run, the nameURLmap will contain the repository urls for all folders created
nameURLmap.forEach(function(value, key){
    console.log(key + ': ' + value);
});

