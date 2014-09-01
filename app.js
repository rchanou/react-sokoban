var express = require('express');
var bodyParser = require('body-parser');
var ejs = require('ejs');

var app = express();
app.set('port', (process.env.PORT || 5000));
app.use(express.static(__dirname + '/public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.engine('html', ejs.renderFile);

app.get('/', function(req, res){
	res.render('index.html');
	//res.send('sup');
});

app.listen(app.get('port'), function(){
	console.log('react-sokoban running at ' + app.get('port'));
});