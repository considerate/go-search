const express = require('express');
const elasticsearch = require('elasticsearch');

const app = express();

const PORT = process.env.PORT || 3000;

// Set up view rendering using handlebars templates
app.set('view engine', 'html');
app.set('view engine', 'hbs');
app.set('views', __dirname + '/views')

const client = new elasticsearch.Client({
    host: 'localhost:9200',
    log: 'trace'
});

app.get('/', function(req, res) {
    const query = req.query.q;
        if(query){
            // TODO: parse query by tokenizer
            //
            // We can do multi search for different things
            // OR query_string searches in all fields it seems like
            
            // Format of query is 
            // [{header},
            // {queryBody},
            // {header},
            // {queryBody}, ...]
            let body = [{ index: 'gosearch'},
                        {query: {
                                match: {
                                    name: query,
                                }
                            }
                        },
                        { index: 'gosearch'},
                        {query: { query_string: { query}}},
                    ];
            client.msearch({body})
                .then(result => {
                    console.log(JSON.stringify(result));
                    const results = result.responses
                        .reduce( (acc, response) => {
                            // TODO: handle duplicate hits
                            // maybe that should get increased scores?
                            acc = acc.concat(response.hits.hits.map( r => r._source));
                            return acc;
                        },[]);
                    res.render('index', {
                            results,
                        });
                })
                .catch(console.error);
    }else {
        res.render('index', {});
    }

});

app.listen(PORT, function () {
    console.log('Example app listening on port ' + PORT)
});
