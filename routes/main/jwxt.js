var USERMSG = require('../../db').USERMSG;
const charset = require('superagent-charset');
const superagent = require('superagent');
charset(superagent);
var urlencode = require('urlencode');
var cheerio = require('cheerio');
var express = require('express');
var session = require('express-session');
var bodyParser = require('body-parser');
var eventproxy = require('eventproxy');
 /******************************
     *绩点查询模块          *
     ******************************/
var GPA = express.Router();
GPA.use(bodyParser());
GPA.use(function(req, res, next){
	openId = req.session.openId;
	if (openId) {
		USERMSG
			.findOne({openId:openId})
			.exec(function(err, usermsg){
				if (err) {return next(err)}
				userNumber = usermsg.userNumber,
				userName = usermsg.userName,
				password = usermsg.password_jwxt,
				cookie_jwxt = usermsg.cookie_jwxt;
				next();
			});
	}else{
		res.render('sessionErr.ejs');
		console.log('session lost');
	}
})
GPA.get("/",function(req, res, next){
	res.render("GPA/index.ejs");
})
GPA.post("/viewDetail",function(req, res, next){
	var	year = req.body.year,
		item = req.body.item;
	checkKeyExpired(cookie_jwxt, userNumber, function(bool){
		if (bool) {
			getGPA(openId, userNumber, password, cookie_jwxt, userName, year, item, function(result){
				if (result.length>1) {
					res.render("GPA/detail.ejs",{result:result});
				}else{
					res.render("GPA/detailNull.ejs");
				}
			});
		}else{
			getNewKey(openId, userNumber, password,function(key){
				getGPA(openId, userNumber, password, key, userName, year, item, function(result){
					if (result.length>1) {
						res.render("GPA/detail.ejs",{result:result});
					}else{
						res.render("GPA/detailNull.ejs");
					}
				});
			})
		}
	});
})

 /******************************
     *课表查询模块          *
     ******************************/
var Course = express.Router();
Course.use(function(req, res, next){
	openId = req.session.openId;
	USERMSG
		.findOne({openId:openId})
		.exec(function(err, usermsg){
			if (err) {return next(err)}
			userNumber = usermsg.userNumber,
			userName = usermsg.userName,
			password = usermsg.password,
			cookie_jwxt = usermsg.cookie_jwxt;
			next();
		});
})
Course.get("/",function(req, res, next){
	checkKeyExpired(cookie_jwxt, userNumber, function(bool){
		if (bool) {
			getTotalCourse(cookie_jwxt, userNumber, userName,function(html){
				res.render("course/index.ejs",{html:html});
			})
		}else{
			getNewKey(openId, userNumber, password,function(key){
				getTotalCourse(key, userNumber, userName,function(html){
					res.render("course/index.ejs",{html:html});
				})
			})
		}
	});
	
})

 /******************************
     *等级查询模块          *
     ******************************/
var LevelScore = express.Router();
LevelScore.use(function(req, res, next){
	openId = req.session.openId;
	USERMSG
		.findOne({openId:openId})
		.exec(function(err, usermsg){
			if (err) {return next(err)}
			userNumber = usermsg.userNumber,
			userName = usermsg.userName,
			password = usermsg.password,
			cookie_jwxt = usermsg.cookie_jwxt;
			next();
		});
})
LevelScore.get("/",function(req, res, next){
	checkKeyExpired(cookie_jwxt, userNumber, function(bool){
		if (bool) {
			getLevelScore(cookie_jwxt, userNumber, userName,function(result){
				if (result.length>1) {
					res.render("levelscore/index.ejs",{result:result});
				}else{
					res.render("levelscore/detailNull.ejs");
				}
			})
		}else{
			getNewKey(openId, userNumber, password,function(key){
				getLevelScore(key, userNumber, userName,function(result){
					if (result.length>1) {
						res.render("levelscore/index.ejs",{result:result});
					}else{
						res.render("levelscore/detailNull.ejs");
					}
				})
			})
		}
	});
})

module.exports.GPA = GPA;
module.exports.Course = Course;
module.exports.LevelScore = LevelScore;

function getLevelScore(cookie_jwxt, userNumber, userName, callback){
	var url = "http://jwxt2.gdufe.edu.cn:8080/"+cookie_jwxt+"/xsdjkscx.aspx";
	var Headers = {
		'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.106 Safari/537.36',
		'Referer': 'http://jwxt2.gdufe.edu.cn:8080/'+cookie_jwxt+'/xs_main.aspx?xh='+userNumber,
		'Content-Type': 'application/x-www-form-urlencoded'
	}
	superagent.get(url)
		.set(Headers)
		.charset('gbk')
		.query({
			xh: userNumber,
			xm: encodeURIComponent(userName),
			gnmkdm : 'N121606'
		})
		.end(function(err, sres){
			if (err) {return err.message}
			var $ = cheerio.load(sres.text,{decodeEntities:false,normalizeWhitespace:true});
			var $head = $("#DataGrid1 tr.datelisthead td");
			var result = [
				[
					$head.eq(0).text(),
					$head.eq(1).text(),
					$head.eq(2).text(),
					$head.eq(3).text(),
					$head.eq(4).text(),
					$head.eq(5).text(),
					$head.eq(6).text(),
					$head.eq(7).text(),
					$head.eq(8).text(),
					$head.eq(9).text()
				],
			];
			$("#DataGrid1 tr").each(function(index, element){
				if (index>0) {
					var detail = [
						$(element).children('td').eq(0).text(),
						$(element).children('td').eq(1).text(),
						$(element).children('td').eq(2).text(),
						$(element).children('td').eq(3).text(),
						$(element).children('td').eq(4).text(),
						$(element).children('td').eq(5).text(),
						$(element).children('td').eq(6).text(),
						$(element).children('td').eq(7).text(),
						$(element).children('td').eq(8).text(),
						$(element).children('td').eq(9).text()
					]
					result.push(detail);
				}
			})
			callback(result);
		})
}
function getTotalCourse(cookie_jwxt, userNumber, userName, callback){
	var url = "http://jwxt2.gdufe.edu.cn:8080/"+cookie_jwxt+"/xskbcx.aspx";
	var Headers = {
		'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.106 Safari/537.36',
		'Referer': 'http://jwxt2.gdufe.edu.cn:8080/'+cookie_jwxt+'/xs_main.aspx?xh='+userNumber,
		'Content-Type': 'application/x-www-form-urlencoded'
	}
	superagent.get(url)
		.set(Headers)
		.charset('gbk')
		.query({
			xh: userNumber,
			xm: encodeURIComponent(userName),
			gnmkdm : 'N121603'
		})
		.end(function(err, sres){
			if (err) {return err.message}
			var $ = cheerio.load(sres.text,{decodeEntities:false,normalizeWhitespace:true});
			var result = $.html("#Table1");
			callback(result);
		})
}
function getNewKey(openId, userNumber, password, callback){
	superagent.get("http://jwxt2.gdufe.edu.cn:8080")
		.end(function(err, res){
			var r_url = res.redirects[0];
			var key = r_url.slice(r_url.indexOf("("),r_url.lastIndexOf(")")+1);
			var url_str = 'http://jwxt2.gdufe.edu.cn:8080/'+key+'/default2.aspx';
			superagent.post(url_str)
				.set('Content-Type','application/x-www-form-urlencoded')
				.send({
					__VIEWSTATE:'/wEPDwUKMTMzMzIxNTg3OWRkO9Vv+EWYZgvydwl2qChGWXb6Yx0=',
					__EVENTVALIDATION: '/wEWDALgt9uDDAKl1bKzCQLs0fbZDAKEs66uBwK/wuqQDgKAqenNDQLN7c0VAuaMg+INAveMotMNAoznisYGArursYYIAt+RzN8IJIwKRvcaapK+AFuRzuTbSELEhQA=',
					txtUserName: userNumber,
					TextBox2: password,
					txtSecretCode: '',
					RadioButtonList1: '%D1%A7%C9%FA',
					Button1:'',
					lbLanguage:''
				})
				.end(function(err, res){
					callback(key);
					USERMSG.findOneAndUpdate({openId:openId},{cookie_jwxt:key},{new:true},function(err,usermsg){
						if (err) {return err.message}
					})
				})
		})
}
function checkKeyExpired(cookie_jwxt, userNumber, callback){
	if (!cookie_jwxt) {
		callback(false);
		return;
	}
	var url = 'http://jwxt2.gdufe.edu.cn:8080/'+cookie_jwxt+'/xs_main.aspx?xh='+userNumber;
	var request = superagent.get(url)
		.set('Content-Type','application/x-www-form-urlencoded')
		.end(function(err, res){
			if (err) {return err.message}
			if (res.redirects.length>0) {
				callback(false)
			}else{
				callback(true)
			}
		})
}
function getGPA(openId, userNumber, password, key, userName, year, item, callback){
	var url = 'http://jwxt2.gdufe.edu.cn:8080/'+key+'/xscjcx_dq.aspx?xh='+userNumber+'&xm='+encodeURIComponent(userName)+'&gnmkdm=N121605';
	var Headers = {
		'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.106 Safari/537.36',
		'Referer': 'http://jwxt2.gdufe.edu.cn:8080/'+key+'/xs_main.aspx?xh='+userNumber
	}
	superagent.get(url)
		.set(Headers)
		.end(function(err, res){
			var $ = cheerio.load(res.text);
			var __VIEWSTATE = $("#__VIEWSTATE").val();
			var __EVENTVALIDATION = $("#__EVENTVALIDATION").val();
			var __EVENTTARGET = $("#__EVENTTARGET").val();
			var __EVENTARGUMENT = $("#__EVENTARGUMENT").val();
			var __LASTFOCUS = $("#__LASTFOCUS").val();
			var Headers = {
				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.106 Safari/537.36',
				'Referer': 'http://jwxt2.gdufe.edu.cn:8080/'+key+'/xscjcx_dq.aspx?xh='+userNumber+'xm='+escape(userName)+'&gnmkdm=N121605',
				'Content-Type': 'application/x-www-form-urlencoded'
			}
			var url = 'http://jwxt2.gdufe.edu.cn:8080/'+key+'/xscjcx_dq.aspx?xh='+userNumber+'&xm='+escape(userName)+'&gnmkdm=N121605';
			superagent.post(url)
				.set(Headers)
				.send({
					__EVENTTARGET:'ddlxq',
					__EVENTARGUMENT:__EVENTARGUMENT,
					__LASTFOCUS:__LASTFOCUS,	
					__VIEWSTATE:__VIEWSTATE,
					__EVENTVALIDATION:__EVENTVALIDATION,
					ddlxn: year,
					ddlxq: item
				})
				.end(function(err, res){
					if (err) {return err.message};
					superagent.post(url)
						.charset('gbk')
						.set(Headers)
						.send({
							__EVENTTARGET:__EVENTTARGET,
							__EVENTARGUMENT:__EVENTARGUMENT,
							__LASTFOCUS:__LASTFOCUS,	
							__VIEWSTATE:__VIEWSTATE,
							__EVENTVALIDATION:__EVENTVALIDATION,
							ddlxn: year,
							ddlxq: item,
							btnCx: urlencode(' 查  询 ','gb2312')
						})
						.end(function(err, res){
							var $ = cheerio.load(res.text, {decodeEntities: false,normalizeWhitespace:true});
							var $head = $("#DataGrid1 tr.datelisthead td");
							var result = [
								[
									$head.eq(3).text(),
									$head.eq(6).text(),
									$head.eq(7).text(),
									$head.eq(8).text(),
									$head.eq(9).text(),
									$head.eq(10).text(),
									$head.eq(11).text(),
									$head.eq(12).text(),
									$head.eq(13).text()
								],
							];
							$("#DataGrid1 tr").each(function(index, element){
								if (index>0) {
									var detail = [
										$(element).children('td').eq(3).text(),
										$(element).children('td').eq(6).text(),
										$(element).children('td').eq(7).text(),
										$(element).children('td').eq(8).text(),
										$(element).children('td').eq(9).text(),
										$(element).children('td').eq(10).text(),
										$(element).children('td').eq(11).text(),
										$(element).children('td').eq(12).text(),
										$(element).children('td').eq(13).text()
									]
									result.push(detail);
								}
							})
							callback(result);
						})
				})
		})
}

//查询今日课程
exports.getTodaysCourse = function (openId, callback){
	var ep = new eventproxy();
	USERMSG
		.findOne({openId:openId})
		.exec(function(err, usermsg){
			if (err) {return next(err)}
			var	userNumber = usermsg.userNumber,
				userName = usermsg.userName,
				password = usermsg.password,
				cookie_jwxt = usermsg.cookie_jwxt;

			checkKeyExpired(cookie_jwxt, userNumber, function(bool){
				if (bool) {
					inner(cookie_jwxt, userNumber, userName);
				}else{
					getNewKey(openId, userNumber, password,function(key){
						inner(key, userNumber, userName);
					})
				}
				ep.all('data',function(courses){
					callback(courses);
				})
			});
		});

	function inner(cookie_jwxt, userNumber, userName){
		var url = "http://jwxt2.gdufe.edu.cn:8080/"+cookie_jwxt+"/xskbcx.aspx";
		var Headers = {
			'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.106 Safari/537.36',
			'Referer': 'http://jwxt2.gdufe.edu.cn:8080/'+cookie_jwxt+'/xs_main.aspx?xh='+userNumber,
			'Content-Type': 'application/x-www-form-urlencoded'
		}
		superagent.get(url)
			.set(Headers)
			.charset('gbk')
			.query({
				xh: userNumber,
				xm: encodeURIComponent(userName),
				gnmkdm : 'N121603'
			})
			.end(function(err, sres){
				if (err) {return err.message}
				var $ = cheerio.load(sres.text,{decodeEntities:false,normalizeWhitespace:true}),
					now = new Date(),
					day = now.getDay(),
					colToGet,
					courses = [],
					offsets = [],
					skips = [];
				if (day===0) {
					colToGet = 8;
				}else{
					colToGet = day+1;
				}
				function incrementOffset(index) {
				    if (offsets[index]) {
				        offsets[index]++;
				    } else {
				        offsets[index] = 1;
				    }
				}

				function getOffset(index) {
				    return offsets[index] || 0;
				}
				$("#Table1 tr").each(function(rowIndex) {
					if (rowIndex>1) {
						var thisOffset = getOffset(rowIndex);

						$(this).children().each(function(tdIndex) {

						    var rowspan = $(this).attr("rowspan");

						    if (tdIndex + thisOffset >= colToGet) {
						        if(skips[rowIndex]) return false;
						        
						        var text = $(this).html();
						        if (text.indexOf('&nbsp')===-1) {
						        	courses.push(text);
						        }
						        
						        if (rowspan > 1) {
						            for (var i = 1; i < rowspan; i++) {
						                skips[rowIndex + i] = true;
						            }
						        }

						        return false;
						    }

						    if (rowspan > 1) {
						        for (var i = 1; i < rowspan; i++) {
						            incrementOffset(rowIndex + i);
						        }
						    }
						});
					}
				});
				ep.emit('data',courses);
			})
	}
	
}