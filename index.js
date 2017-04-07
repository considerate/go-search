const express = require('express');
const app = express();

const PORT = process.env.PORT || 3000;

// Set up view rendering using handlebars templates
app.set('view engine', 'html');
app.set('view engine', 'hbs');
app.set('views', __dirname + '/views')

const context = {
    results: [
    {
        "name": "read",
        "arguments": [["x", "int"], ["y", "double"], ["str", "string"]],
        "returns": "string"
    },
    {
        "name": "write",
        "arguments": [["offset", "int"], ["length", "double"]],
        "returns": ""
    },
    ],
};
app.get('/', function(req, res) {
    const query = req.query.q;
    //TODO: replace mocked context with results from elasticsearch
    const results = context.results
        .filter(r => (r.name || '').indexOf(query) != -1);
    res.render('index', {
        results,
    });
});

app.listen(PORT, function () {
    console.log('Example app listening on port ' + PORT)
});
