/**
 * import modules
 */
var express = require('express');
var bodyParser = require("body-parser");
var methodOverride = require('method-override');

/**
 * set global variables
 */
global._path =
{
	home : __dirname,
	modules : __dirname + "/modules",
	libs : __dirname + "/libs"
};

/**
 * set process options
 */
global._options = 
{
	port : 3000
};

process.argv.forEach(function (val, index, array)
{
	val = val.substring(1); //parse character '-'
	
	var split = val.split("=");
	if(_options.hasOwnProperty(split[0]))
		_options[split[0]] = split[1];
});

/**
 * create express and imp
 */
var app = express();
var server = app.listen(_options.port, function()
{
	console.log('Listening on port %d', server.address().port);
});

var imp = require('nodejs-imp');
imp.setPattern(_path.modules + "/main/views/template/{{name}}.html");
imp.setPattern(_path.modules + "/{{prefix}}/views/template/{{name}}.html", "[a-z0-9\-\_]*");

var Renderer = require(_path.libs + "/Renderer");
imp.addRenderModule(Renderer.replacePath);

/**
 * set static dirs
 */
app.use('/modules', express.static(_path.modules));

/**
 * set middleware
 */
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(methodOverride());
app.use(imp.render);

/**
 * error handling
 */
app.use(function(err, req, res, next)
{
	console.error("=================================================");
	console.error("time : " + new Date().toString());
	console.error("name : Exception");
	console.error("-------------------------------------------------");
	console.error(err.stack);
	console.error("=================================================");

	res.statusCode = 500;
	res.send(err.stack);
});

process.on('uncaughtException', function (err)
{
	console.error("\n\n");
	console.error("=================================================");
	console.error("time : " + new Date().toString());
	console.error("name : UncaughtException");
	console.error("-------------------------------------------------");
	console.error(err.stack);
	console.error("=================================================\n\n");
});

var BinderLoader = require(_path.libs + "/BinderLoader");
BinderLoader.load(_path.modules);

imp.setBinderModules(BinderLoader.modules);

var routerLoader = require(_path.libs + "/RouterLoader");
routerLoader.load(_path.modules);

var typeList = ['get', 'post', 'put', 'delete'];
for(var i=0; i<typeList.length; i++)
{
	(function(type)
	{
		app[type]('/*', function(req, res, next)
		{
			var check = false;
			var routerList = routerLoader[type];
			if(routerList)
			{
				for(var key in routerList)
				{
					var regx = new RegExp(key, "gi");
					if(regx.exec(req.path))
					{
						routerLoader[type][key](req, res, next);
						check = true;
						break;
					}
				}
			}
			
			if(!check)
			{
				res.status(404).end("Not Found");
			}
		});
	})(typeList[i]);
}