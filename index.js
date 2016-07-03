var express = require('express');
var session = require('express-session');
var cookieParser = require('cookie-parser');
var wechat = require('wechat');
var superagent = require('superagent');
var USERMSG = require('./db').USERMSG;

var app = express();
app.set('view engine','ejs');
app.set('views',__dirname+'/views');
//设置静态文件访问路径
app.use(express.static('node_modules/jquery-weui'));
app.use(express.static('public'));
//update数据库
var updateDB = require('./routes/main/updateDB').updateDB;
app.get('/updateDB/:admin/:password',function(req, res, next){
	console.log("updateDB");
	var admin = req.params.admin,
		password = req.params.password;
	if (admin === "kingvid" && password === "chan") {
		updateDB(res);
	}else{
		console.log("update数据库 命令出错！");
		res.send("不存在此路径！");
	}
})

//配置config
var config = {
    token: 'daweige',
    appid: 'wx7d9d5d6238e621c9',
    encodingAESKey: 'eDmXbVSofIJekymT5Ykvbg6nYgO46VyDuNmvrWm2Dm8'
};
//微信服务模块
app.use(express.query());	//wechat query
var HandleText = require('./routes/wechat/text/index').HandleText;  					//文字处理模块
var HandleEvent = require('./routes/wechat/event/index').HandleEvent;					//事件处理模块
var HandleLink = require('./routes/wechat/link/index').HandleLink;						//链接处理模块
var HandleImage = require('./routes/wechat/image/index').HandleImage;					//图片处理模块
var HandleVoice = require('./routes/wechat/voice/index').HandleVoice;					//语音处理模块	
var HandleVideo = require('./routes/wechat/video/index').HandleVideo;					//视频处理模块
var HandleShortVideo = require('./routes/wechat/shortvideo/index').HandleShortVideo;	//短视频处理模块
var HandleLocation = require('./routes/wechat/location/index').HandleLocation;			//地理位置处理模块
app.use('/wechat', wechat(config.token, 
						wechat.text(function(message, req, res, next) {
						    HandleText(message, req, res, next);
						}).event(function(message, req, res, next) {
							HandleEvent(message, req, res, next);
						})));


//port
// var port = process.env.PORT || 3000;
var port = 80;
app.listen(port,function(req, res) {
    console.log('app is running at port ' + port);
});

//session
app.use(cookieParser());
app.use(session({
  secret: 'Kingvid-ChanCalledDaWeiGeEither',
  name: 'openSessionId',
  resave: false,
  saveUninitialized: true
}))
//核心逻辑
app.use('/main',function(req, res, next){
	if (!req.session.openId) {
	    req.session.openId = req.query.openId;
	}
	next();
})
app.use('/main/login',require('./routes/main/login').login);
app.use('/main/GPA',require('./routes/main/jwxt').GPA);
app.use('/main/course',require('./routes/main/jwxt').Course);
app.use('/main/levelscore',require('./routes/main/jwxt').LevelScore);
app.use('/main/library',require('./routes/main/library').Library);
app.use('/main/card',require('./routes/main/card').Card);

//每一小时清空一次captcha文件夹
var fs = require('fs');
var path = require('path');
setInterval(function(){
	var removePath = "./public/captcha/";
	removeDirForce(removePath);
	function removeDirForce(dirPath) {
	    fs.readdir(dirPath,function(err, files) {
	        if (err) {
	            console.log(JSON.stringify(err));
	        } else {
	            if (files.length > 0) {
	                files.forEach(function(file) {
	                    var filePath = dirPath + file;
	                    fs.stat(filePath,function(err, stats) {
	                        if (err) {
	                            console.log(JSON.stringify(err));
	                        } else {
	                            if (stats.isFile()) {
	                                fs.unlink(filePath,function(err) {
	                                    if (err) {
	                                        console.log(JSON.stringify(err));
	                                    }
	                                });
	                            }

	                            if (stats.isDirectory()) {
	                                removeDirForce(filePath + '/');
	                            }
	                        }
	                    });
	                });
	            } else {
	            	return;
	            }
	        }
	    });
	}
},30*60*1000);