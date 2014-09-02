var express = require('express');
var bodyParser = require('body-parser');
var ejs = require('ejs');
var mongodb = require('mongodb');
var ObjectID = mongodb.ObjectID;

var app = express();
app.set('port', (process.env.PORT || 5000));
app.use(express.static(__dirname + '/public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.engine('html', ejs.renderFile);

var MONGOLAB_URI = 'mongodb://heroku_app29085563:c4c1au5dd01kmrv6gvrou6mu3o@ds033760.mongolab.com:33760/heroku_app29085563';

mongodb.MongoClient.connect(MONGOLAB_URI, function(err, db){
	if (err) throw err;
	
	var levels = db.collection('levels');
	
	app.get('/levels', function(req, res){
		res.setHeader('Content-Type', 'application/json');
		levels.find().sort({ _id: 1 }).toArray(function(err, docs){
			if (err) {
				res.status(500).end();
			}			
			res.status(200).send(JSON.stringify(docs));
		});
	});
	
	app.get('/level', function(req, res){
	    res.setHeader('Content-Type', 'application/json');
		levels.find(ObjectID(req.query.id)).sort({ _id: 1 }).toArray(function(err, docs){
			if (err) {
				res.status(500).end();
			}			
			res.status(200).send(JSON.stringify(docs[0]));
		});	
	});
	
	app.post('/level/delete', function(req, res){
	    res.setHeader('Content-Type', 'application/json');		
		levels.remove(
			{ _id: ObjectID(req.body._id) },
			{ justOne: true },
			function(err, result, details){
				if (err) throw err;
				levels.find().sort({ _id: 1 }).toArray(function(err, docs){
					if (err) {
						res.status(500).end();
					}
					res.status(200).send(JSON.stringify(docs));
				});
			}
		);
	});
	
	app.post('/level', function(req, res) {
		res.setHeader('Content-Type', 'application/json');
		levels.update(
			{ _id: ObjectID(req.body._id) },
			req.body.level, 
			{ upsert: true },
			function(err, result, details){
				if (err) {
					res.status(500).end();
				}
				console.log(details);
				levels.find().sort({ _id: 1 }).toArray(function(err, docs){
					if (err) throw err;
					res.status(201).send(JSON.stringify(docs));
				});
			}
		);
	});
});

app.get('/', function(req, res){
	res.render('index.html');
});

app.listen(app.get('port'), function(){
	console.log('react-sokoban running at ' + app.get('port'));
});