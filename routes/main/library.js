var USERMSG = require('../../db').USERMSG;
var phridge = require('phridge/lib/main');
var express = require('express');
var session = require('express-session');
var bodyParser = require('body-parser');
const charset = require('superagent-charset');
const superagent = require('superagent');
charset(superagent);
var cheerio = require('cheerio');
var eventproxy = require('eventproxy');
var checkIndexCookie = require('./checkCookieExpired').checkIndexCookie;
var checkCookie = require('./checkCookieExpired').checkCookie;
var CookieToJSON = require('./CookieParser').CookieToJSON;
var CookieToStr = require('./CookieParser').CookieToStr;
var fs = require('fs');
var tesseract = require('node-tesseract');

var Library = express.Router();
Library.use(bodyParser());
function htmlDecode(str) {
    // 一般可以先转换为标准 unicode 格式（有需要就添加：当返回的数据呈现太多\\\u 之类的时）
    str = unescape(str.replace(/\\u/g, "%u"));
    // 再对实体符进行转义
    // 有 x 则表示是16进制，$1 就是匹配是否有 x，$2 就是匹配出的第二个括号捕获到的内容，将 $2 以对应进制表示转换
    str = str.replace(/&#(x)?(\w+);/g,
    function($, $1, $2) {
        return String.fromCharCode(parseInt($2, $1 ? 16 : 10));
    });

    return str;
}
//书目检索
Library.get('/search', function(req, res, next){
	var searchStr = req.query.searchStr;
	var url_str = "http://opac.library.gdufe.edu.cn/opac/openlink.php?strSearchType=title&match_flag=forward&historyCount=1&strText="+encodeURIComponent(searchStr)+"&doctype=ALL&with_ebook=on&displaypg=20&showmode=list&sort=CATA_DATE&orderby=desc&location=ALL";
	superagent.get(url_str)
		.end(function(err, sres){
			var $ = cheerio.load(sres.text,{normalizeWhitespace:true});
			if ($("#search_book_list").length>0) {
				var array = [];
				$("#search_book_list li").each(function(){
					var text = $(this).children('p').html();
					var pos1 = text.indexOf('<br>');
					var pos2 = text.indexOf('</span>');
					var pos3 = text.indexOf('<br>',pos2);
					var p2 = text.slice(text.indexOf('<span>')+6,pos1);
					var p3 = text.slice(pos1+4,pos2);
					var p4 = text.slice(pos2+7,pos3);
					var p5 = text.slice(pos3+4,text.indexOf('<br>',pos3+4));
					var title = $(this).find('a').eq(0).text();
					var bookId = $(this).find('a').eq(0).attr('href');
					var result = {
						title: title.slice(title.indexOf('.')+1),
						p1: $(this).find('span').eq(0).text(),
						p2: htmlDecode(p2),
						p3: htmlDecode(p3),
						p4: htmlDecode(p4),
						p5: p5,
						href: bookId.slice(bookId.indexOf('?')+1)
					}
					array.push(result);
				})
				res.render('library/search.ejs',{result:array, searchStr:searchStr});

			}else{
				res.render('library/search.ejs',{result:false, searchStr:searchStr});
			}

		})
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
	var ep = new eventproxy();
	var marc_no = req.query.marc_no;
	var url = 'http://opac.library.gdufe.edu.cn/opac/item.php?marc_no='+marc_no;
	superagent.get(url)
		.end(function(err, sres){
			var $ = cheerio.load(sres.text,{normalizeWhitespace:true});
			var doubanBookId = $('.sharing_zy li').eq(0).find('a').attr('href');
			doubanBookId = doubanBookId.slice(doubanBookId.indexOf('isbn/')+5).replace(/\/|-/g,'');
			superagent.get('http://opac.library.gdufe.edu.cn/opac/ajax_douban.php?isbn='+doubanBookId)
				.accept('json')
				.end(function(err, sres){
					var result = eval( "(" + htmlDecode(sres.text).replace(/\\/g,'') + ")" );
					ep.emit('getDoubanData',{imgSrc:result.image,doubanSummary:result.summary});
				})
			
			var result = {
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
			}
			ep.emit('getLibraryData',result);
		})
	ep.all('getDoubanData', 'getLibraryData',function(doubanData, libData){
		libData.imgSrc = doubanData.imgSrc;
		libData.caption7 = doubanData.doubanSummary;
		res.render('library/bookDetail.ejs',{result:libData});
	})
})
Library.use(function(req, res, next){
	if (req.query._id) {
		USERMSG
			.findOne({_id:req.query._id})
			.exec(function(err, usermsg){
				if (err) {return next(err)}
				userNumber = usermsg.userNumber,
				userName = usermsg.userName,
				password = usermsg.password,
				cookie_library = usermsg.cookie_library,
				cookie_index = usermsg.cookie_index;

				req.session.openId = usermsg.openId;
				next();
			});
	}else{
		openId = req.session.openId;
		if (openId) {
			USERMSG
				.findOne({openId:openId})
				.exec(function(err, usermsg){
					if (err) {return next(err)}
					_id = usermsg._id,
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
	}
	
})
//进入图书馆系统导航页
Library.get("/",function(req, res, next){
	res.render("library/index.ejs",{lendingNull:'',_id:_id});	
});
//查看借阅历史
Library.get('/lendHistory',function(req, res, next){
	var url = "http://opac.library.gdufe.edu.cn/reader/book_hist.php";
	fastVisit(url, cookie_library, cookie_index, openId, function(html){
		var $ = cheerio.load(html,{normalizeWhitespace:true});
		if ($("#mylib_content .mylib_con_con.pan_top").length>0) {
			res.render('library/detailNull.ejs');
		}else{
			var $table = $("#mylib_content table");
			$table.children('tr').each(function(){
				$td = $(this).children('td');
				$td.eq(0).remove();
				$td.eq(1).remove();
				$td.eq(2).text($td.eq(2).text());
				$td.eq(6).remove();
			})
			res.render('library/lendHistory.ejs',{html:$.html($table)}); 
		}
	})
})
//查看借书（未还）信息
Library.get('/lending',function(req, res, next){
	var url = "http://opac.library.gdufe.edu.cn/reader/book_lst.php";
	fastVisit(url, cookie_library, cookie_index, openId, function(html){
		var $ = cheerio.load(html,{normalizeWhitespace:true});
		if ($("#mylib_content .mylib_con_con.pan_top").length>0) {
			res.render('library/detailNull.ejs');
		}else{
			var result = [];
			result.push({number:'条码号',name:'题名/责任者',dateStart:'借阅日期',dateEnd:'应还日期',renewNumber:'续借量',alert:$('.alert').text()});
			$("#mylib_content table tr").each(function(index){
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
	fastVisit(url, cookie_library, cookie_index, openId, function(html, cookie_library){
		var $ = cheerio.load(html,{normalizeWhitespace:true});
		var rank = $("span.sr-only").text();
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
	})
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

module.exports.Library = Library;

//superagent模拟访问
function fastVisit(url, cookie_library, cookie_index, openId, callback){
	checkCookie(cookie_library, url,function(bool){
		if (bool) {	
			superagent.get(url)
				.set('Cookie',cookie_library)
				.end(function(err, sres){
					callback(sres.text, cookie_library);
				})
		}else{
			checkIndexCookie(cookie_index, openId, userNumber, password, function(cookie){
				var url_index = "http://opac.library.gdufe.edu.cn/reader/hwthau.php";
				var Headers = {
					'Host': 'opac.library.gdufe.edu.cn',
					'Connection': 'keep-alive',
					'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
					'Upgrade-Insecure-Requests': '1',
					'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.106 Safari/537.36',
					'Referer': 'http://my.gdufe.edu.cn/index.portal',
					'Accept-Encoding': 'gzip, deflate, sdch',
					'Accept-Language': 'zh-CN,zh;q=0.8',
					'Cookie':cookie
				}
				superagent.get(url_index)
					.redirects(0)
					.set(Headers)
					.end(function(err, sres){
						var UpdateCookies = {};
				        CookieToJSON(undefined,UpdateCookies,cookie);
			            CookieToJSON(sres.header["set-cookie"],UpdateCookies);
			        	cookie_library = CookieToStr(UpdateCookies);
			        	Headers.Cookie = cookie_library;
						superagent.get(url)
							.set(Headers)
							.end(function(err, sres){
								USERMSG.findOneAndUpdate({openId:openId},{cookie_library:cookie_library,cookie_index:cookie_index},function(err, doc){
									if (err) {console.log('updateDB err')}
									callback(sres.text, cookie_library);
								});
							})
					})
			},url)
		}
	})
}
//phantomjs模拟访问
function phantomVisit(cookieStr, url, _steps ,callback){
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