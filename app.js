
var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');
var util = require('util');
var exec = require('child_process').exec
var child;

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: 'guerilla',
  resave: false,
  saveUninitialized: true,
}))

var twitterAPI = require('node-twitter-api');
var twitter = new twitterAPI({
    consumerKey: 'aaQRborRRHoGIAcsUn1V4f3Od',
    consumerSecret: 'ONsoPTfc5q9tQzp8fCzw88VBNGzwuyeZmo68XkxEcG3lpPOQEX',
    callback: 'http://localhost:3000/twitterAuth'
});

var accessToken = "4233610347-imHn72NJOyQNbmsGk6l29WUDaEOXijtKuftPfNL";
var accessTokenSecret = "7QxKmxOxZ2fV8kvUHRq56kChJB4av4PdYTDcB2u5LnEiq";
var requestToken = "hR293AAAAAAAixkBAAABUSRqAvc";
var requestTokenSecret = "xqFUa3MX9tHFKgvmkiVvMiTA3EjcKVxv";

var userTweets = [];
var lastTweets = [];
var lastUpdated = new Date();
var firstTime = true;
var hitUrls = [];

function arrayContains(string){
  console.log("the array " + hitUrls);
  console.log("ths string " + string);
  console.log("array contains " + hitUrls.lastIndexOf(string));
  /*
  for (var i = 0; i < hitUrls.length; i++) {
    if(hitUrls[i] === string){
      return true;
    }else{
      return false;
    }
  };
  */
  return hitUrls.lastIndexOf(string);
}

function urlify(text) {
    var urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.replace(urlRegex, function(url) {
        return '<a href="' + url + '">' + url + '</a>';
    })
}

var refreshTwitter = function(){
  console.log("refreshing twitter");
  twitter.getTimeline("home_timeline", {count:40}, accessToken, accessTokenSecret,
    function(error, data, response) {
        if (error) {
          console.dir(error);
            // something went wrong
        } else {
            for (var i = 0; i < data.length; i++) {
                var text = data[i].text;
                var newText = urlify(text);
                //do stuff
                data[i].text = newText;
                /*
                if (data[i].entities.urls != undefined){
                    console.dir(data[i].entities.urls);
                    for (var k = 0; k < data[i].entities.urls.length; k++) {
                        console.dir("Getting URL" + data[i].entities.urls[k].url)
                        var inArray = arrayContains(data[i].entities.urls[k].url);
                        console.log(inArray);
                        if(inArray === -1){
                          console.log("doing the get " + i);
                          hitUrls.push(data[i].entities.urls[k].url);
                          child = exec('wget ' + data[i].entities.urls[k].url,
                            function (error, stdout, stderr) {
                              console.dir('stdout: ' + stdout);
                              console.dir('stderr: ' + stderr);
                              if (error !== null) {
                                console.dir('exec error: ' + error);
                              }else{
                                //hitUrls.push(data[i].entities.urls[k].url);
                              }
                          });
                        }
                    }
                }
                */
			       }; 
            lastUpdated = new Date();
            console.log(lastUpdated);
            lastTweets = data;
            if(firstTime){
              firstTime = false;
              var minutes = 1, the_interval = minutes * 60 * 1000;
              setInterval(refreshTwitter, the_interval);
            }
        }
    });
};

refreshTwitter();

app.get('/',function(req,res){
  res.render('news');
});

app.get('/tweets',function(req,res){
  res.render('index');
});

app.get('/twitter/setup', function (req, res) {
  twitter.getRequestToken(function(error, requestToken, requestTokenSecret, results){
    if (error) {
        console.log("Error getting OAuth request token : " + error);
        console.dir(error);
    } else {
        //store token and tokenSecret somewhere, you'll need them later; redirect user 
        req.session.requestToken = requestToken;
        req.session.requestTokenSecret = requestTokenSecret;
        console.dir(req.session);
        res.redirect('https://twitter.com/oauth/authenticate?oauth_token=' + requestToken);
    }
  });
});

app.get('/twitterAuth',function(req,res){
  twitter.getAccessToken(req.session.requestToken, req.session.requestTokenSecret, req.query.oauth_verifier, function(error, accessToken, accessTokenSecret, results) {
    if (error) {
        console.log(error);
    } else {
        req.session.accessToken = accessToken;
        req.session.accessTokenSecret = accessTokenSecret;

        twitter.verifyCredentials(accessToken, accessTokenSecret, function(error, data, response) {
          if (error) {
              console.dir(error);
              //something was wrong with either accessToken or accessTokenSecret 
              //start over with Step 1
              res.redirect('/twitter/setup'); 
          } else {
              console.dir(req.session);
              res.redirect('/');
          }
      });
    }
  });
});

app.get('/twitter/timeline',function(req,res){
  res.send(lastTweets);
})

app.get('/twitter/mentions',function(req,res){
  twitter.getTimeline("mentions_timeline", {}, accessToken, accessTokenSecret,
    function(error, data, response) {
        if (error) {
          console.dir(error);
            // something went wrong
        } else {
            res.send(data);
        }
    });
});

app.get('/twitter/retweets',function(req,res){
  twitter.getTimeline("retweets_of_me", {}, accessToken, accessTokenSecret,
    function(error, data, response) {
        if (error) {
          console.dir(error);
            // something went wrong
        } else {
            res.send(data);
        }
    });
});

app.get('/twitter/usertimeline',function(req,res){
  twitter.getTimeline("user_timeline", {screen_name:"guerilla_sync"}, accessToken, accessTokenSecret,
    function(error, data, response) {
        if (error) {
          console.dir(error);
            // something went wrong
        } else {
            res.send(data);
        }
    });
});

app.get('/user/tweets',function(req,res){
  res.send(userTweets);
});

app.post('/add/usertweet',function(req,res){
  userTweets.push(req.body.tweet);
  res.status(200);
  res.end()
});


/*
var hostname = "172.16.0.2";

var server = app.listen(80,hostname,function () {
  var host = hostname;
  var port = server.address().port;

  console.log('Example app listening at http://%s:%s', host, port);
});
*/


var server = app.listen(3000,function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log('Example app listening at http://%s:%s', host, port);
});




