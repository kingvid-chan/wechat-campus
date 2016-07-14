var USERMSG = require('../../db').USERMSG;
var phridge = require('phridge/lib/main');
var express = require('express');
var session = require('express-session');
var cheerio = require('cheerio');
const charset = require('superagent-charset');
const superagent = require('superagent');
charset(superagent);
var checkIndexCookie = require('./checkCookieExpired').checkIndexCookie;
var checkCookie = require('./checkCookieExpired').checkCookie;
var CookieToStr = require('./CookieParser').CookieToStr;
var CookieToJSON = require('./CookieParser').CookieToJSON;

var Card = express.Router();
Card.use(function(req, res, next){
	openId = req.session.openId;
	if (openId) {
		USERMSG
			.findOne({openId:openId})
			.exec(function(err, usermsg){
				if (err) {return next(err)}
				userNumber = usermsg.userNumber,
				userName = usermsg.userName,
				password = usermsg.password,
				cookie_index = usermsg.cookie_index,
				cookie_card = usermsg.cookie_card,
				card_id = usermsg.card_id;

				var Headers = {
					'Host': 'cardinfo.gdufe.edu.cn',
					'Connection': 'keep-alive',
					'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
					'Upgrade-Insecure-Requests': '1',
					'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.106 Safari/537.36',
					'Referer': 'http://my.gdufe.edu.cn/index.portal',
					'Accept-Encoding': 'gzip, deflate, sdch',
					'Accept-Language': 'zh-CN,zh;q=0.8'
				}
				if (!cookie_card) {
					checkIndexCookie(cookie_index, openId, userNumber, password, function(cookie){
						var url_index = "http://cardinfo.gdufe.edu.cn/gdcjportalHome.action";
						Headers.Cookie = cookie;
						cookie_index = cookie;
						superagent.get(url_index)
							.redirects(0)
							.set(Headers)
							.end(function(err, sres){
								var UpdateCookies = {};
						        CookieToJSON(undefined,UpdateCookies,cookie);
					            CookieToJSON(sres.header["set-cookie"],UpdateCookies);
					        	cookie_card = CookieToStr(UpdateCookies);
					        	Headers.Cookie = cookie_card;
								superagent.get('http://cardinfo.gdufe.edu.cn/accounttodayTrjn.action')
									.set(Headers)
									.end(function(err, sres){
										var $ = cheerio.load(sres.text);
										card_id = $("#account").val();
										USERMSG.findOneAndUpdate({openId:openId},{card_id:card_id,cookie_card:cookie_card,cookie_index:cookie_index},function(err, doc){if (err) {console.log('updateDB err')}})
										next();
									})
							})
					})
				}else if(!card_id){
					checkIndexCookie(cookie_index, openId, userNumber, password, function(cookie){
						var url_index = "http://cardinfo.gdufe.edu.cn/gdcjportalHome.action";
						cookie_index = Headers.Cookie = cookie;
						superagent.get(url_index)
							.redirects(0)
							.charset('gbk')
							.set(Headers)
							.end(function(err, sres){
								var UpdateCookies = {};
						        CookieToJSON(undefined,UpdateCookies,cookie);
					            CookieToJSON(sres.header["set-cookie"],UpdateCookies);
					        	cookie_card = CookieToStr(UpdateCookies);
					        	Headers.Cookie = cookie_card;
					        	superagent.get('http://cardinfo.gdufe.edu.cn/accounttodayTrjn.action')
					        		.set(Headers)
					        		.end(function(err, sres){
					        			var $ = cheerio.load(sres.text);
					        			card_id = $("#account").val();
					        			USERMSG.findOneAndUpdate({openId:openId},{card_id:card_id,cookie_card:cookie_card,cookie_index:cookie_index},function(err, doc){if (err) {console.log('updateDB err')}})
					        			next();
					        		})
							})
					})
				}else{
					next();
				}
			});
	}else{
		res.render('sessionErr.ejs');
		console.log('session lost');
	}
})
//获取饭卡基本信息
exports.getBasicInfo = function (cookie_index, cookie_card, openId, userNumber, password, callback){
	//设置模拟登陆HEAD
	var Headers = {
		'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
		'Accept-Encoding':'gzip, deflate, sdch',
		'Accept-Language':'zh-CN,zh;q=0.8',
		'Cache-Control':'no-cache',
		'Connection':'keep-alive',
		'Host':'cardinfo.gdufe.edu.cn',
		'Pragma':'no-cache',
		'Referer':'http://cardinfo.gdufe.edu.cn/accleftframe.action',
		'Upgrade-Insecure-Requests':'1',
		'User-Agent':'Mozilla/5.0 (Windows NT 6.3; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/49.0.2623.110 Safari/537.36'
	}
	if (cookie_card) {
		Headers.Cookie = cookie_card;
		superagent.get("http://cardinfo.gdufe.edu.cn/accountcardUser.action")
		    .set(Headers)
		    .end(function(err, sres){
		        if (err) {return err.message}
		        if(sres.redirects.length>0){
		        	cookie_card_expired(cookie_index, openId, userNumber, password, callback);
		        }else{
		        	var $ = cheerio.load(sres.text);
		        	var result = {
		        		state: $("div:contains(冻结状态)").parent().prev().text().replace(/[^\u4E00-\u9FA5]/g,''),
		        		ice_state: $("div:contains(冻结状态)").parent().next().text().replace(/[^\u4E00-\u9FA5]/g,''),
		        		lost_state: $("div:contains(挂失状态)").parent().next().text(),
		        		check_state: $("div:contains(检查状态)").parent().next().text(),
		        		money_less: $("td:contains(卡余额)").eq(-1).text()
		        	}
		        	callback(result);
		        }
		    })
	}else{
		cookie_card_expired(cookie_index, openId, userNumber, password, callback);
	}
	
	function cookie_card_expired(cookie_index, openId, userNumber, password, callback){
		checkIndexCookie(cookie_index, openId, userNumber, password,function(newCookie_index){
			cookie_index = newCookie_index;
			superagent.get('http://cardinfo.gdufe.edu.cn/gdcjportalHome.action')
				.redirects(0)
			    .charset('gbk')
				.set('Content-Type','text/html;charset=gbk')
			    .set('Cookie',newCookie_index)
			    .end(function(err, sres){
			        if (err) {return err.message}
			        var UpdateCookies = {};
			        CookieToJSON(undefined,UpdateCookies,newCookie_index);
		            CookieToJSON(sres.header["set-cookie"],UpdateCookies);
		        	cookie_card = CookieToStr(UpdateCookies);
		        	var Headers = {
		        		'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
		        		'Accept-Encoding':'gzip, deflate, sdch',
		        		'Accept-Language':'zh-CN,zh;q=0.8',
		        		'Cache-Control':'no-cache',
		        		'Connection':'keep-alive',
		        		'Host':'cardinfo.gdufe.edu.cn',
		        		'Pragma':'no-cache',
		        		'Referer':'http://cardinfo.gdufe.edu.cn/accleftframe.action',
		        		'Upgrade-Insecure-Requests':'1',
		        		'Cookie':cookie_card,
		        		'User-Agent':'Mozilla/5.0 (Windows NT 6.3; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/49.0.2623.110 Safari/537.36'
		        	}
		        	superagent.get("http://cardinfo.gdufe.edu.cn/accountcardUser.action")
		        		.set(Headers)
		        		.end(function(err, sres){
		        			if (err) {return err.message}
		        			var $ = cheerio.load(sres.text);
		        			var result = {
		        				state: $("div:contains(冻结状态)").parent().prev().text().replace(/[^\u4E00-\u9FA5]/g,''),
				        		ice_state: $("div:contains(冻结状态)").parent().next().text().replace(/[^\u4E00-\u9FA5]/g,''),
				        		lost_state: $("div:contains(挂失状态)").parent().next().text(),
				        		check_state: $("div:contains(检查状态)").parent().next().text(),
				        		money_less: $("td:contains(卡余额)").eq(-1).text()
		        			}
		        			callback(result, cookie_card, cookie_index);
							USERMSG.findOneAndUpdate({openId:openId},{cookie_card:cookie_card,cookie_index:cookie_index},function(err, doc){if (err) {console.log('updateDB err')}});
		        		})
			    })
		})
	}
}

//查看最近一周的历史交易记录
Card.get('/history',function(req, res, next){
	checkCookie(cookie_card,'http://cardinfo.gdufe.edu.cn/accounthisTrjn.action',function(bool){
		if (bool) {
			var url = 'http://cardinfo.gdufe.edu.cn/accounthisTrjn.action';
			var cookie = {};
			CookieToJSON(undefined,cookie,cookie_card);
			phridge.spawn({
			    loadImages: false
			}).then(function (phantom) {
			    // phantom is now a reference to a specific PhantomJS process 
			    phantom.run(url, cookie, function (url, cookie, resolve) {
			        // this code runs inside PhantomJS 
			        var page = webpage.create();
			     	page.onResourceRequested = function(requestData, request) {
			     	  if ((/http:\/\/.+?\.css$/gi).test(requestData['url'])||(/http:\/\/.+?\.js$/gi).test(requestData['url'])) {
			     	    request.abort();
			     	  }   
			     	};
     		        for (var p in cookie) {
     	    	        phantom.addCookie({
     	    				"name": p,
     	    				'value':cookie[p],
     	    				'domain':'.gdufe.edu.cn',
     	    				'path':"/",
     	    			})
     		        }
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
			     	        resolve('err');
			     	        phantom.exit();
			     	    } 
			     	};
			     	
			     	var steps = [
			     	    function() {
			     	        page.open(url);
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
			     	    	    debug: false,  // optional
			     	    	    interval: 50,  // optional
			     	    	    timeout: 1000,  // optional
			     	    	    check: function () {
			     	    	        return page.evaluate(function() {
			     	    	            return document.querySelector('input')!==null;
			     	    	        });
			     	    	    },
			     	    	    success: function () {
			     	    	        // we have what we want
			     	    	        page.evaluate(function() {
			     	    	        	document.getElementById('accounthisTrjn1').submit()
			     	    	        })
			     	    	    },
			     	    	    error: function () {
			     	    	    	resolve('err');
			     	    	    	phantom.exit();
			     	    	    }
			     	    	});
			     	        
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
			     	    	    debug: false,  // optional
			     	    	    interval: 50,  // optional
			     	    	    timeout: 1000,  // optional
			     	    	    check: function () {
			     	    	        return page.evaluate(function() {
			     	    	            return document.querySelector('strong.baizi a')!==null;
			     	    	        });
			     	    	    },
			     	    	    success: function () {
			     	    	        // we have what we want
			     	    	        page.evaluate(function() {
			     	    	        	var form1 = document.getElementById('accounthisTrjn2');
			     	    	        	form1.inputStartDate.value=DateDiff(7);
			     	    	        	var a = new Date();
			     	    	        	form1.inputEndDate.value=FormatDateToStr(a);
			     	    	        	form1.submit();
			     	    	        })
			     	    	    },
			     	    	    error: function () {
			     	    	    	resolve('err');
			     	    	    	phantom.exit();
			     	    	    }
			     	    	});
			     	    },
			     	    function(){
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
			     	    	    debug: false,  // optional
			     	    	    interval: 50,  // optional
			     	    	    timeout: 5000,  // optional
			     	    	    check: function () {
			     	    	        return page.evaluate(function() {
			     	    	        	setTimeout(function() {
			     	    	        		return document.getElementsByName('form1').length>0;
			     	    	        	}, 100);
			     	    	        });
			     	    	    },
			     	    	    success: function () {
			     	    	        // we have what we want
			     	    	        page.evaluate(function() {
		     	    	        	   	document.form1.action="accounthisTrjn3.action";
		     	    	        	    document.form1.submit();
			     	    	        })
			     	    	    },
			     	    	    error: function () {
			     	    	    	resolve('err');
			     	    	    	phantom.exit();
			     	    	    }
			     	    	});
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
			     	    	};
			     	    	waitFor({
			     	    	    debug: false,  // optional
			     	    	    interval: 50,  // optional
			     	    	    timeout: 5000,  // optional
			     	    	    check: function () {
			     	    	        return page.evaluate(function() {
			     	    	            return document.getElementById('tables')!==null;
			     	    	        });
			     	    	    },
			     	    	    success: function () {
			     	    	        // we have what we want
			     	    	       var result = page.evaluate(function(){
			     	    	        	return document.getElementById('tables').outerHTML;
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
			        	res.render('err.ejs',{redirectUrl:'/main/card/history?openId='+openId});
			        }else{
			        	var $ = cheerio.load(result);
			        	$('tr').eq(-1).remove();
			        	$('tr').each(function(){
			        		var $td = $(this).children();
			        		$td.eq(1).remove();
			        		$td.eq(2).remove();
			        		$td.eq(7).remove();
			        		$td.eq(9).remove();
			        	})
			        	res.send($.html());
			        }
			    });
			});
		}else{
			checkIndexCookie(cookie_index, openId, userNumber, password, function(cookie){
				var url_index = "http://cardinfo.gdufe.edu.cn/gdcjportalHome.action";
				var Headers = {
					'Host': 'cardinfo.gdufe.edu.cn',
					'Connection': 'keep-alive',
					'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
					'Upgrade-Insecure-Requests': '1',
					'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.106 Safari/537.36',
					'Referer': 'http://my.gdufe.edu.cn/index.portal',
					'Accept-Encoding': 'gzip, deflate, sdch',
					'Accept-Language': 'zh-CN,zh;q=0.8'
				}
				Headers.Cookie = cookie;
				superagent.get(url_index)
					.redirects(0)
					.charset('gbk')
					.set(Headers)
					.end(function(err, sres){
						var UpdateCookies = {};
				        CookieToJSON(undefined,UpdateCookies,cookie);
			            CookieToJSON(sres.header["set-cookie"],UpdateCookies);
			        	cookie_card = CookieToStr(UpdateCookies);
			        	USERMSG.findOneAndUpdate({openId:openId},{cookie_card:cookie_card,cookie_index:cookie_index},function(err, doc){if (err) {console.log('updateDB err')}})
			        	phridge.spawn({
						    loadImages: false
						}).then(function (phantom) {
						    // phantom is now a reference to a specific PhantomJS process 
		    			    phantom.run(url, UpdateCookies, function (url, cookie, resolve) {
		    			        // this code runs inside PhantomJS 
		    			        var page = webpage.create();
		    			     	page.onResourceRequested = function(requestData, request) {
		    			     	  if ((/http:\/\/.+?\.css$/gi).test(requestData['url'])||(/http:\/\/.+?\.js$/gi).test(requestData['url'])) {
		    			     	    request.abort();
		    			     	  }   
		    			     	};
		         		        for (var p in cookie) {
		         	    	        phantom.addCookie({
		         	    				"name": p,
		         	    				'value':cookie[p],
		         	    				'domain':'.gdufe.edu.cn',
		         	    				'path':"/",
		         	    			})
		         		        }
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
		    			     	        resolve('err');
		    			     	        phantom.exit();
		    			     	    } 
		    			     	};
		    			     	
		    			     	var steps = [
		    			     	    function() {
		    			     	        page.open(url);
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
		    			     	    	    debug: false,  // optional
		    			     	    	    interval: 50,  // optional
		    			     	    	    timeout: 1000,  // optional
		    			     	    	    check: function () {
		    			     	    	        return page.evaluate(function() {
		    			     	    	            return document.querySelector('input')!==null;
		    			     	    	        });
		    			     	    	    },
		    			     	    	    success: function () {
		    			     	    	        // we have what we want
		    			     	    	        page.evaluate(function() {
		    			     	    	        	document.getElementById('accounthisTrjn1').submit()
		    			     	    	        })
		    			     	    	    },
		    			     	    	    error: function () {
		    			     	    	    	resolve('err');
		    			     	    	    	phantom.exit();
		    			     	    	    }
		    			     	    	});
		    			     	        
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
		    			     	    	    debug: false,  // optional
		    			     	    	    interval: 50,  // optional
		    			     	    	    timeout: 1000,  // optional
		    			     	    	    check: function () {
		    			     	    	        return page.evaluate(function() {
		    			     	    	            return document.querySelector('strong.baizi a')!==null;
		    			     	    	        });
		    			     	    	    },
		    			     	    	    success: function () {
		    			     	    	        // we have what we want
		    			     	    	        page.evaluate(function() {
		    			     	    	        	var form1 = document.getElementById('accounthisTrjn2');
		    			     	    	        	form1.inputStartDate.value=DateDiff(7);
		    			     	    	        	var a = new Date();
		    			     	    	        	form1.inputEndDate.value=FormatDateToStr(a);
		    			     	    	        	form1.submit();
		    			     	    	        })
		    			     	    	    },
		    			     	    	    error: function () {
		    			     	    	    	resolve('err');
		    			     	    	    	phantom.exit();
		    			     	    	    }
		    			     	    	});
		    			     	    },
		    			     	    function(){
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
		    			     	    	    debug: false,  // optional
		    			     	    	    interval: 50,  // optional
		    			     	    	    timeout: 5000,  // optional
		    			     	    	    check: function () {
		    			     	    	        return page.evaluate(function() {
		    			     	    	        	setTimeout(function() {
		    			     	    	        		return document.getElementsByName('form1').length>0;
		    			     	    	        	}, 100);
		    			     	    	        });
		    			     	    	    },
		    			     	    	    success: function () {
		    			     	    	        // we have what we want
		    			     	    	        page.evaluate(function() {
		    		     	    	        	   	document.form1.action="accounthisTrjn3.action";
		    		     	    	        	    document.form1.submit();
		    			     	    	        })
		    			     	    	    },
		    			     	    	    error: function () {
		    			     	    	    	resolve('err');
		    			     	    	    	phantom.exit();
		    			     	    	    }
		    			     	    	});
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
		    			     	    	};
		    			     	    	waitFor({
		    			     	    	    debug: false,  // optional
		    			     	    	    interval: 50,  // optional
		    			     	    	    timeout: 5000,  // optional
		    			     	    	    check: function () {
		    			     	    	        return page.evaluate(function() {
		    			     	    	            return document.getElementById('tables')!==null;
		    			     	    	        });
		    			     	    	    },
		    			     	    	    success: function () {
		    			     	    	        // we have what we want
		    			     	    	       var result = page.evaluate(function(){
		    			     	    	        	return document.getElementById('tables').outerHTML;
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
						        	res.render('err.ejs',{redirectUrl:'/main/card/history?openId='+openId});
						        }else{
						        	var $ = cheerio.load(result);
						        	$('tr').eq(-1).remove();
						        	$('tr').each(function(){
						        		var $td = $(this).children();
						        		$td.eq(1).remove();
						        		$td.eq(2).remove();
						        		$td.eq(7).remove();
						        		$td.eq(9).remove();
						        	})
						        	res.send($.html());	
						        }
						    });
						});
					})
						
			})
		}
	})
})

//查看当天消费记录
Card.get('/thisDay',function(req, res, next){
	var Headers = {
		'Host': 'cardinfo.gdufe.edu.cn',
		'Connection': 'keep-alive',
		'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
		'Upgrade-Insecure-Requests': '1',
		'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.106 Safari/537.36',
		'Referer': 'http://my.gdufe.edu.cn/index.portal',
		'Accept-Encoding': 'gzip, deflate, sdch',
		'Accept-Language': 'zh-CN,zh;q=0.8',
		'Cookie':cookie_card
	}
	superagent.post('http://cardinfo.gdufe.edu.cn/accounttodatTrjnObject.action')
		.set(Headers)
		.set('Content-Type','application/x-www-form-urlencoded')
		.send({account:card_id,inputObject:'all',Submit:encodeURIComponent(' 确 定 ')})
		.charset('gbk')
		.end(function(err, sres){
			if (sres.redirects.length>0) {
				checkIndexCookie(cookie_index, openId, userNumber, password, function(cookie){
					var url_index = "http://cardinfo.gdufe.edu.cn/gdcjportalHome.action";
					cookie_index = Headers.Cookie = cookie;
					superagent.get(url_index)
						.redirects(0)
						.charset('gbk')
						.set(Headers)
						.end(function(err, sres){
							var UpdateCookies = {};
					        CookieToJSON(undefined,UpdateCookies,cookie);
				            CookieToJSON(sres.header["set-cookie"],UpdateCookies);
				        	cookie_card = CookieToStr(UpdateCookies);
				        	Headers.Cookie = cookie_card;
							superagent.post('http://cardinfo.gdufe.edu.cn/accounttodatTrjnObject.action')
								.set(Headers)
								.set('Content-Type','application/x-www-form-urlencoded')
								.send({account:card_id,inputObject:'all',Submit:encodeURIComponent(' 确 定 ')})
								.charset('gbk')
								.end(function(err, sres){
									var $ = cheerio.load(sres.text,{decodeEntities:false,normalizeWhitespace:true});
									$('#tables tr').eq(-1).remove();
									$('#tables tr').each(function(){
										var $td = $(this).children();
										$td.eq(1).remove();
										$td.eq(2).remove();
										$td.eq(7).remove();
										$td.eq(9).remove();
									})
									res.render('card/history.ejs',{html:$.html('#tables'),openId:openId});
									USERMSG.findOneAndUpdate({openId:openId},{cookie_card:cookie_card,cookie_index:cookie_index},function(err, doc){if (err) {console.log('updateDB err')}});
								})
						})
				})
			}else{
				var $ = cheerio.load(sres.text,{decodeEntities:false,normalizeWhitespace:true});
				$('#tables tr').eq(-1).remove();
				$('#tables tr').each(function(){
					var $td = $(this).children();
					$td.eq(1).remove();
					$td.eq(2).remove();
					$td.eq(7).remove();
					$td.eq(9).remove();
				})
				res.render('card/history.ejs',{html:$.html('#tables'),openId:openId});
			}
		})
})
module.exports.Card = Card;