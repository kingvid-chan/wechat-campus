var USERMSG = require('../../db').USERMSG;
var phridge = require('phridge/lib/main');
var express = require('express');
var session = require('express-session');
var bodyParser = require('body-parser');
const charset = require('superagent-charset');
const superagent = require('superagent');
charset(superagent);
var cheerio = require('cheerio');
var checkIndexCookie = require('./checkCookieExpired').checkIndexCookie;
var checkCookie = require('./checkCookieExpired').checkCookie;
var CookieToJSON = require('./CookieParser').CookieToJSON;
var CookieToStr = require('./CookieParser').CookieToStr;
var fs = require('fs');
var tesseract = require('node-tesseract');

var Library = express.Router();
Library.use(bodyParser());
//书目检索
Library.get('/search', function(req, res, next){
		var searchStr = req.query.searchStr;
		phridge.spawn({
		    loadImages: false
		}).then(function (phantom) {
		    // phantom is now a reference to a specific PhantomJS process 
		    phantom.run(searchStr, function (searchStr, resolve) {
		        // this code runs inside PhantomJS 
		        var page = webpage.create();
		     	page.onResourceRequested = function(requestData, request) {
		     	  if ((/http:\/\/.+?\.css$/gi).test(requestData['url'])) {
		     	    
		     	    request.abort();
		     	  }   
		     	};
		     	page.onConsoleMessage = function(msg) {
		     	  	console.log(msg);
		     	}
		     	// var url_str = 'http://opac.library.gdufe.edu.cn/opac/openlink.php?strSearchType=title&match_flag=forward&historyCount=1&strText=%E5%B9%B3%E5%87%A1%E7%9A%84%E4%B8%96%E7%95%8C&doctype=ALL&with_ebook=on&displaypg=20&showmode=list&sort=CATA_DATE&orderby=desc&location=ALL';
		     	var url_str = "http://opac.library.gdufe.edu.cn/opac/openlink.php?strSearchType=title&match_flag=forward&historyCount=1&strText="+encodeURIComponent(searchStr)+"&doctype=ALL&with_ebook=on&displaypg=20&showmode=list&sort=CATA_DATE&orderby=desc&location=ALL";
		     	var loadInProgress = false;
		     	var processIndex = 0;
		     	page.onLoadStarted = function() {
		     	    loadInProgress = true;
		     	    
		     	};
		     	page.onLoadFinished = function(status) {
		     	    loadInProgress = false;
		     	    if (status !== 'success') {
		     	        console.log('Unable to access network');
		     	        resolve('err');
		     	        phantom.exit();
		     	    } 
		     	};
		     	
		     	var steps = [
		     	    function() {
		     	        page.open(url_str);
		     	    },
		     	    function() {
		     	    	function waitFor ($config) {
		     	    	    $config._start = $config._start || new Date();

		     	    	    if ($config.timeout && new Date - $config._start > $config.timeout) {
		     	    	        if ($config.error) $config.error();
		     	    	        if ($config.debug) console.log('timedout ' + (new Date - $config._start) + 'ms');
		     	    	        return;
		     	    	    }

		     	    	    if ($config.check()) {
		     	    	        if ($config.debug) console.log('success ' + (new Date - $config._start) + 'ms');
		     	    	        return $config.success();
		     	    	    }

		     	    	    setTimeout(waitFor, $config.interval || 0, $config);
		     	    	}
		     	    	waitFor({
		     	    	    debug: true,  // optional
		     	    	    interval: 50,  // optional
		     	    	    timeout: 1000,  // optional
		     	    	    check: function () {
		     	    	        return page.evaluate(function() {
		     	    	            return document.getElementById('mainbox')!==null;
		     	    	        });
		     	    	    },
		     	    	    success: function () {
		     	    	        // we have what we want
		     	    	        var result = page.evaluate(function() {
				     	        	if ($("#search_book_list").length>0) {
				     	        		var array = [];
				     	        		
				     	        		$("#search_book_list li").each(function(){
				     	        			if ($(this).find('a').eq(0).find('b').length>0) {
				     	        				var text = $(this).find('p')[0].innerHTML;
				     	        				var pos1 = text.indexOf('<br>');
				     	        				var pos2 = text.indexOf('</span>');
				     	        				var pos3 = text.indexOf('<br>',pos2);
				     	        				var p2 = text.slice(text.indexOf('<span>')+6,pos1).replace(" ","");
				     	        				var p3 = text.slice(pos1+4,pos2).replace(" ","");
				     	        				var p4 = text.slice(pos2+7,pos3).replace(" ","");
				     	        				var p5 = text.slice(pos3+4,text.indexOf('<br>',pos3+4)).replace(" ","");
				     	        				var title = $(this).find('a').eq(0).text();
				     	        				var bookId = $("#search_book_list li").eq(0).find('a').eq(0).attr('href');
				     	        				var _result = {
				     	        					title: title.slice(title.indexOf('.')+1),
				     	        					p1: $(this).find('span').eq(0).text(),
				     	        					p2: p2,
				     	        					p3: p3,
				     	        					p4: p4,
				     	        					p5: p5,
				     	        					href: bookId.slice(bookId.indexOf('?')+1)
				     	        				}
				     	        				array.push(_result);
				     	        			}
				     	        		})
				     	        		return array;
				     	        	}else{
				     	        		return false;
				     	        	}
				     	        });
				     	        resolve(result);
		     	    	    },
		     	    	    error: function () {
		     	    	    	resolve('err');
		     	    	    	phantom.exit();
		     	    	    }
		     	    	});
		     	        
		     	    }
		     	];
		     	interval = setInterval(function() {
		     	    if (!loadInProgress && typeof steps[processIndex] == "function") {
		     	        
		     	        steps[processIndex]();
		     	        processIndex++;
		     	    }
		     	    if (typeof steps[processIndex] != "function") {
		     	        
		     	        // phantom.exit();
		     	        clearInterval(interval);
		     	    }
		     	}, 50);
		    }).then(function (result) {
		        // inside node again
		        if (result==='err') {
		        	res.render('err.ejs',{redirectUrl:'/main/library/search?searchStr='+searchStr});
		        }else{
		        	res.render('library/search.ejs',{result:result, searchStr:searchStr});
		        }
		    });
		});
	})
//返回馆藏信息
Library.get('/collections',function(req, res, next){
	var marc_no = req.query.marc_no;
	var url = 'http://opac.library.gdufe.edu.cn/opac/ajax_item.php';
	superagent.get(url)
		.query({marc_no:marc_no})
		.end(function(err, sres){
			if (err) {return next(err)}
			var $ = cheerio.load(sres.text);
			var result = [];
			result[0] = ['索书号','条码号','馆藏地','书刊状态'];
			$('tr').each(function(_index){
				$(this).find('td').eq(2).remove();
				if (_index===0) {
					return;
				}else{
					var _result = [];
					$(this).find('td').each(function(index){
						_result[index] = $(this).text();
					})
					result.push(_result);
				}
			})
			res.send(result);
		})
})
//返回馆藏书籍详情
Library.get('/bookDetail',function(req, res, next){
	var marc_no = req.query.marc_no;
	var url = 'http://opac.library.gdufe.edu.cn/opac/item.php?marc_no='+marc_no;
	phridge.spawn({
	    loadImages: false
	}).then(function (phantom) {
	    // phantom is now a reference to a specific PhantomJS process
	    phantom.run(url, function (url, resolve) {
	        // this code runs inside PhantomJS 
	        var page = webpage.create();
	     	page.onResourceRequested = function(requestData, request) {
	     	  if ((/http:\/\/.+?\.css$/gi).test(requestData['url'])) {
	     	    
	     	    request.abort();
	     	  }   
	     	};
	     	page.onConsoleMessage = function(msg) {
	     	  console.log(msg);
	     	}
	     	var loadInProgress = false;
	     	var processIndex = 0;
	     	page.onLoadStarted = function() {
	     	    loadInProgress = true;
	     	    
	     	};
	     	page.onLoadFinished = function(status) {
	     	    loadInProgress = false;
	     	    if (status !== 'success') {
	     	        console.log('Unable to access network');
	     	        resolve("err");
	     	        phantom.exit();
	     	    } else {
	     	        console.log("load finished");
	     	    }
	     	};
	     	var steps = [
	     		function(){
	     			page.open(url);
	     		},
	     		function(){
	     			var bookDetail = page.evaluate(function(){
	     				return $("#book_info .book_article").html();
	     			})
	     			resolve(bookDetail);
	     		}
	     	];
	     	interval = setInterval(function() {
	     	    if (!loadInProgress && typeof steps[processIndex] == "function") {
	     	        
	     	        steps[processIndex]();
	     	        processIndex++;
	     	    }
	     	    if (typeof steps[processIndex] != "function") {
	     	        
	     	        phantom.exit();
	     	        clearInterval(interval);
	     	    }
	     	}, 50);
	    }).then(function (_result) {
	        // inside node again
	        // console.log(_result);
	        if (_result==='err') {
	        	res.render('err.ejs',{redirectUrl:'/main/library/bookDetail?marc_no='+marc_no});
	        }else{
	        	var $ = cheerio.load(_result,{decodeEntities:false,normalizeWhitespace:true});
	        	var result = {
	        		imgSrc:$("#book_img").attr('src'),
	        		title1: '题名/责任者',
	        		caption1: $("dt:contains(题名/责任者)").next('dd').text(),
	        		title2: '1.出版发行项',
	        		caption2: $("dt:contains(出版发行项)").next('dd').text(),
	        		title3: '2.ISBN及定价',
	        		caption3: $("dt:contains(ISBN及定价)").next('dd').text(),
	        		title4: '3.载体形态项',
	        		caption4: $("dt:contains(载体形态项)").next('dd').text(),
	        		title5: '4.其它题名',
	        		caption5: $("dt:contains(其它题名)").next('dd').text(),
	        		title6: '5.提要文摘附注',
	        		caption6: $("dt:contains(提要文摘附注)").next('dd').text(),
	        		title7: '6.豆瓣简介',
	        		caption7: $("#intro").html()
	        	}
	        	res.render('library/bookDetail.ejs',{result:result});
	        }
	        
	    });
	});

})
Library.use(function(req, res, next){
	openId = req.session.openId;
	if (openId) {
		USERMSG
			.findOne({openId:openId})
			.exec(function(err, usermsg){
				if (err) {return next(err)}
				userNumber = usermsg.userNumber,
				userName = usermsg.userName,
				password = usermsg.password,
				cookie_library = usermsg.cookie_library,
				cookie_index = usermsg.cookie_index;
				next();
			});
	}else{
		res.render('sessionErr.ejs');
		console.log('session lost');
	}
})
//进入图书馆系统导航页
Library.get("/",function(req, res, next){
	res.render("library/index.ejs",{lendingNull:''});	
});
//查看借阅历史
Library.get('/lendHistory',function(req, res, next){
	var url = "http://opac.library.gdufe.edu.cn/reader/book_hist.php";
	checkCookie(cookie_library,url,function(bool){
		if (bool) {
			
			var url = "http://opac.library.gdufe.edu.cn/reader/book_hist.php";
			var steps = {name:'lendHistory',state:'login'};
			tryVisit(cookie_library, url, steps, hanle_lendHistory_login);
			function hanle_lendHistory_login(result){
				if (result==='err') {
					res.render('err.ejs',{redirectUrl:'/main/library/lendHistory'});
				}else{
					if (!result) {
						res.render('library/detailNull.ejs');
					}else{
						res.render('library/lendHistory.ejs',{html:result});
					}
				}
			}
		}else{
			
			var url = "http://opac.library.gdufe.edu.cn/reader/hwthau.php";
			checkIndexCookie(cookie_index, openId, userNumber, password, function(cookie){
				var steps = {name:'lendHistory',state:'unlogin'};
				tryVisit(cookie, url, steps, hanle_lendHistory_unlogin);
			})
			function hanle_lendHistory_unlogin(result){
				if (result==='err') {
					res.render('err.ejs',{redirectUrl:'/main/library/lendHistory'});
				}else{
					if (!result.content) {
						res.render('library/detailNull.ejs');
					}else{
						res.render('library/lendHistory.ejs',{html:result.content});
					}
					cookie_library = result.cookies;
					USERMSG.findOneAndUpdate({openId:openId},{cookie_library:result.cookies},function(err){if (err) {return err.message}});
				}
			}
		}
	})
})
//查看借书（未还）信息
Library.get('/lending',function(req, res, next){
	var url = "http://opac.library.gdufe.edu.cn/reader/book_lst.php";
	checkCookie(cookie_library,url, function(bool){
		if (bool) {
			
			var url = "http://opac.library.gdufe.edu.cn/reader/book_lst.php";
			var steps = {name:'lending',state:'login'};
			tryVisit(cookie_library, url, steps, function(_result){
				if (_result==='err') {
					res.render('err.ejs',{redirectUrl:'/main/library/lending'});
				}else{
					if (!_result) {
						res.render('library/detailNull.ejs');
					}else{
						var $ = cheerio.load(_result);
						var result = [];
						result.push({number:'条码号',name:'题名/责任者',dateStart:'借阅日期',dateEnd:'应还日期',renewNumber:'续借量',alert:$('.alert').text(),cookies:_result.cookies});
						$("table tr").each(function(index){
							if (index>0) {
								var raw = {};
								var _this = $(this).children('td');
								var input = _this.eq(-1).find('input');
								var inputMsg = input.attr('onclick');
								raw.number = _this.eq(0).text();
								raw.name = _this.eq(1).text();
								raw.dateStart = _this.eq(2).text();
								raw.dateEnd = _this.eq(3).text();
								raw.renewNumber = _this.eq(4).text();
								raw.bookId = inputMsg.slice(inputMsg.indexOf("('")+2,inputMsg.indexOf("',"));
								raw.check = inputMsg.slice(inputMsg.indexOf(",'")+2,inputMsg.lastIndexOf("',"));
								raw.listId = index;
								result.push(raw);
							}
						})
						res.render('library/lending.ejs',{result:result});
					}
				}
			})
		}else{
			console.log("expired");
			var url = "http://opac.library.gdufe.edu.cn/reader/hwthau.php";
			var steps = {name:'lending',state:'unlogin'};
			checkIndexCookie(cookie_index, openId, userNumber, password, function(cookie){
				tryVisit(cookie, url, steps, function(result){
					if (result==='err') {
						res.render('err.ejs',{redirectUrl:'/main/library/lending'});
					}else{
						if (!result.content) {
							res.render('library/detailNull.ejs');
						}else{
							res.render('library/lending.ejs',{result:result.content});
						}
						cookie_library = result.cookies;
						USERMSG.findOneAndUpdate({openId:openId},{cookie_library:result.cookies},function(err){if (err) {return err.message}});
					}
				})
			})
		}
	})
})
//返回续借验证码
Library.get('/lending/renewCaptcha',function(req, res, next){
	var captchaUrl = 'http://opac.library.gdufe.edu.cn/reader/captcha.php';
	var Cookies = req.query.cookies;
	var Check = req.query.check;
	var Bar_code = req.query.bar_code;
	var HeadersForCaptcha = {
		'Accept':'image/webp,image/*,*/*;q=0.8',
		'Accept-Encoding':'gzip, deflate, sdch',
		'Host':'opac.library.gdufe.edu.cn',
		'Referer':'http://opac.library.gdufe.edu.cn/reader/book_lst.php',
		'User-Agent':'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.106 Safari/537.36',
		'Cookie': Cookies
	}
	var path = "./public/captcha/captcha"+Math.floor(Math.random()*10000)+".gif";
	function getCaptcha(){
		var req_captcha = superagent.get(captchaUrl).set(HeadersForCaptcha);
		req_captcha.pipe(fs.createWriteStream(path));
		req_captcha.on("end",function(err, sres){
		    tesseract.process(path,function(err, captcha) {
		        if(err) {
		            console.error(err);
		        } else {
		            captcha = captcha.replace(/[^\w\-]/g,"");
		            if (captcha.length !== 4) {
		                req_captcha.abort();
		                getCaptcha();
		            }else{
		                console.log("captcha done",captcha);
		                var url = 'http://opac.library.gdufe.edu.cn/reader/ajax_renew.php';
		                var now = Date.now();
		                var HeadersForRenew = {
		                	'Host':'opac.library.gdufe.edu.cn',
		                	'Referer':'http://opac.library.gdufe.edu.cn/reader/book_lst.php',
		                	'User-Agent':'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.106 Safari/537.36',
		                	'X-Requested-With':'XMLHttpRequest',
		                	'Cookie': Cookies
		                }
		                superagent.get(url)
		                	.set(HeadersForRenew)
		                	.query({bar_code:Bar_code,check:Check,captcha:captcha,time:now})
		                	.end(function(err, sres){
		                		var result = sres.text;
		                		if (result.indexOf('code')!==-1) {
		                			getCaptcha();
		                		}else{
		                			res.send(sres.text);
		                		}
		                	})
		            }
		        }
		    });
		})  
	}
	getCaptcha();
})
//回溯“我的图书馆”，生成图形报告
Library.get('/report', function(req, res, next){
	res.render('library/report.ejs');
})
Library.get('/report/chartPie',function(req, res, next){
	var url = "http://opac.library.gdufe.edu.cn/reader/redr_info.php";
	checkCookie(cookie_library,url,function(bool){
		if (bool) {
			
			superagent.get("http://opac.library.gdufe.edu.cn/reader/redr_info.php")
				.set('Cookie',cookie_library)
				.end(function(err ,sres){
					var $ = cheerio.load(sres.text);
					var rank = $("span.sr-only").text();
					chartPie(rank);
				})
			
		}else{
			
			var url = "http://opac.library.gdufe.edu.cn/reader/hwthau.php";
			checkIndexCookie(cookie_index, openId, userNumber, password, function(cookieStr){
				var cookie = {};
				CookieToJSON(undefined,cookie,cookieStr);
				phridge.spawn({
				    loadImages: false
				}).then(function (phantom) {
				    // phantom is now a reference to a specific PhantomJS process
				    phantom.run(cookie, url, function (cookie, url, resolve) {
				        // this code runs inside PhantomJS 
				        var page = webpage.create();
				        page.customHeaders = {
				            'Referer':'http://my.gdufe.edu.cn/index.portal'
				        };
				        for (var p in cookie) {
			    	        phantom.addCookie({
			    				"name": p,
			    				'value':cookie[p],
			    				'domain':'.gdufe.edu.cn',
			    				'path':"/",
			    			})
				        }
				     	page.onResourceRequested = function(requestData, request) {
				     	  if ((/http:\/\/.+?\.css$/gi).test(requestData['url']) || 
				     	  	  (/http:\/\/.+?\.js$/gi).test(requestData['url']) ||
				     	  	  (/http:\/\/.+?\.htm$/gi).test(requestData['url'])) {
				     	    
				     	    request.abort();
				     	  }   
				     	};
				     	page.open(url, function(status){
				     		var cookies = page.cookies;
				     		var result = {};
				     		result.cookies = "";
				     		for (var i in cookies) {
				     			result.cookies += cookies[i].name+'='+cookies[i].value+"; "
				     		}
				     		var rank = page.evaluate(function(){
				     			return document.querySelector('span.sr-only').innerHTML;
				     		})
				     		result.rank = rank;
				     		resolve(result);
				     	})
				    }).then(function (result) {
				        // inside node again
				        cookie_library = result.cookies;
				        chartPie(result.rank);
				        USERMSG.findOneAndUpdate({openId:openId},{cookie_library:cookie_library},function(err){if (err) {return err.message}});
				    });
				});
			})
		}
	})
	function chartPie(rank){
		var url = "http://opac.library.gdufe.edu.cn/reader/ajax_class_sort.php";
		var Headers = {
			'Host':'opac.library.gdufe.edu.cn',
			'Referer':'http://opac.library.gdufe.edu.cn/tpl/reader/chartPie.htm',
			'User-Agent':'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.106 Safari/537.36',
			'X-Requested-With':'XMLHttpRequest',
			'Cookie':cookie_library
		}
		superagent.get(url)
			.set(Headers)
			.end(function(err, sres){
				if (err) {return next(err)}
				var result = {};
				result.data = sres.text;
				result.rank = rank;
				res.send(result);
			})
	}
})
Library.get('/report/chartColumn',function(req, res, next){
	var url = "http://opac.library.gdufe.edu.cn/reader/ajax_year_sort.php";
	var Headers = {
		'Host':'opac.library.gdufe.edu.cn',
		'Referer':'http://opac.library.gdufe.edu.cn/tpl/reader/chartColumn.htm',
		'User-Agent':'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.106 Safari/537.36',
		'X-Requested-With':'XMLHttpRequest',
		'Cookie':cookie_library
	}
	superagent.get(url)
		.set(Headers)
		.end(function(err, sres){
			if (err) {return next(err)}
			res.send(sres.text);
		})
})
Library.get('/report/chartLine',function(req, res, next){
	var url = "http://opac.library.gdufe.edu.cn/reader/ajax_month_sort.php";
	var Headers = {
		'Host':'opac.library.gdufe.edu.cn',
		'Referer':'http://opac.library.gdufe.edu.cn/tpl/reader/chartLine.htm',
		'User-Agent':'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.106 Safari/537.36',
		'X-Requested-With':'XMLHttpRequest',
		'Cookie':cookie_library
	}
	superagent.get(url)
		.set(Headers)
		.charset('gb2312')
		.end(function(err, sres){
			if (err) {return next(err)}
			res.send(sres.text);
		})
});
Library.get('/report/getRank',function(req, res, next){
	var url = "http://opac.library.gdufe.edu.cn/reader/ajax_month_sort.php";
	var Headers = {
		'Host':'opac.library.gdufe.edu.cn',
		'Referer':'http://opac.library.gdufe.edu.cn/tpl/reader/chartLine.htm',
		'User-Agent':'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.106 Safari/537.36',
		'X-Requested-With':'XMLHttpRequest',
		'Cookie':cookie_library
	}
	superagent.get(url)
		.set(Headers)
		.charset('gb2312')
		.end(function(err, sres){
			if (err) {return next(err)}
			res.send(sres.text);
		})
});

module.exports.Library = Library;

//getCookie
function tryVisit(cookieStr, url, _steps ,callback){
	var cookie = {};
	CookieToJSON(undefined,cookie,cookieStr);
	phridge.spawn({
	    loadImages: false
	}).then(function (phantom) {
	    // phantom is now a reference to a specific PhantomJS process
	    phantom.run(cookie, url, _steps, function (cookie, url, _steps, resolve) {
	        // this code runs inside PhantomJS 
	        var page = webpage.create();
	        var Referer = url.indexOf("hwthau")!==-1;
	        if(Referer) {
	        	page.customHeaders = {
	        	    'Referer':'http://my.gdufe.edu.cn/index.portal'
	        	};
	        }
	        for (var p in cookie) {
    	        phantom.addCookie({
    				"name": p,
    				'value':cookie[p],
    				'domain':'.gdufe.edu.cn',
    				'path':"/",
    			})
	        }
	     	page.onResourceRequested = function(requestData, request) {
	     	  if ((/http:\/\/.+?\.css$/gi).test(requestData['url'])) {
	     	    
	     	    request.abort();
	     	  }   
	     	};
	     	page.onConsoleMessage = function(msg) {
	     	  console.log(msg);
	     	}
	     	var loadInProgress = false;
	     	var processIndex = 0;
	     	page.onLoadStarted = function() {
	     	    loadInProgress = true;
	     	    
	     	};
	     	page.onLoadFinished = function(status) {
	     	    loadInProgress = false;
	     	    if (status !== 'success') {
	     	        console.log('Unable to access network');
	     	        resolve("err");
	     	        phantom.exit();
	     	    } 
	     	};
	     	var AllProcessSteps = {
	     		lendHistory:{
	     			login: [
							    function() {
							        page.open(url);
							    },
							    function() {
							        var lendHistory = page.evaluate(function() {
							        	if ($("#mylib_content .mylib_con_con.pan_top").length>0) {
							        		return false;
							        	}else{
							        		return $("#mylib_content table")[0].outerHTML
							        	}
							            
							        });
							        resolve(lendHistory);
							    }
							],
					unlogin:[
							    function() {
							        page.open(url);
							    },
							    function() {
							        page.evaluate(function() {
							        	$("#nav_mylib li").eq(3).children("a")[0].click();
							        });
							        
							    },
							    function() {
							        var lendHistory = page.evaluate(function() {
							        	if ($("#mylib_content .mylib_con_con.pan_top").length>0) {
							        		return false;
							        	}else{
							        		return $("#mylib_content table")[0].outerHTML
							        	}
							            
							        });
							        var result = {};
							        result.content = lendHistory;
							        var _cookies = page.cookies;
							        result.cookies = "";
							        for (var i in _cookies) {
							        	result.cookies += _cookies[i].name+'='+_cookies[i].value+"; "
							        }
							        resolve(result);
							    }
							]
	     		},
	     		lending:{
	     			login:[
							    function() {
							        page.open(url);
							    },
							    function() {
							        var lending = page.evaluate(function() {
							            if ($("#mylib_content .mylib_con_con.pan_top").length>0) {
							        		return false;
							        	}else{
							        		return $("#mylib_content")[0].outerHTML
							        	}
							        });
							        resolve(lending);
							    }
							],
	     			unlogin:[
							    function() {
							        page.open(url);
							    },
							    function() {
							        page.evaluate(function() {
							        	$("#nav_mylib li").eq(2).children("a")[0].click();
							        });
							        
							    },
							    function() {
							        var lending = page.evaluate(function() {
							            if ($("#mylib_content .mylib_con_con.pan_top").length>0) {
							        		return false;
							        	}else{
							        		return $("#mylib_content")[0].outerHTML
							        	}
							        });
							        var result = {};
							        result.content = lending;
							        var _cookies = page.cookies;
							        result.cookies = "";
							        for (var i in _cookies) {
							        	result.cookies += _cookies[i].name+'='+_cookies[i].value+"; "
							        }
							        resolve(result);
							    }
							]
	     		}
	     	}
	     	var steps;
	     	for (var i in AllProcessSteps) {
	     		if (i === _steps.name) {
	     			if (_steps.state === 'login') {
	     				steps=AllProcessSteps[i].login
	     			}else{
	     				steps=AllProcessSteps[i].unlogin
	     			}
	     		}
	     	}
	     	interval = setInterval(function() {
	     	    if (!loadInProgress && typeof steps[processIndex] == "function") {
	     	        
	     	        steps[processIndex]();
	     	        processIndex++;
	     	    }
	     	    if (typeof steps[processIndex] != "function") {
	     	        
	     	        phantom.exit();
	     	        clearInterval(interval);
	     	    }
	     	}, 50);
	    }).then(function (result) {
	        // inside node again
	        callback(result);
	    });
	});
}