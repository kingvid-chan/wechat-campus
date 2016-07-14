var eventproxy = require('eventproxy');
var cheerio = require('cheerio');
var superagent = require('superagent');
var url = require('url');
var XIAOZHAO = require('../../db').XIAOZHAO;
var SHIXI = require('../../db').SHIXI;
var JIANZHI = require('../../db').JIANZHI;
var XUANJIANG = require('../../db').XUANJIANG;


var updateDB = exports.updateDB = function updateDB(response){
	/*
	 *目标网站
	*/
	//应届生求职网
	var yjs_xiaozhao_urls = [
		'http://m.yingjiesheng.com/recommendlist.php?Action=FullTime',
		'http://m.yingjiesheng.com/recommendlist.php?Action=FullTime&Page=2',
		'http://m.yingjiesheng.com/recommendlist.php?Action=FullTime&Page=3',
		'http://m.yingjiesheng.com/recommendlist.php?Action=FullTime&Page=4',
		'http://m.yingjiesheng.com/recommendlist.php?Action=FullTime&Page=5',
		'http://m.yingjiesheng.com/recommendlist.php?Action=FullTime&Page=6'
	];
	var yjs_shixi_urls = [
		'http://m.yingjiesheng.com/recommendlist.php?Action=PartTime',
		'http://m.yingjiesheng.com/recommendlist.php?Action=PartTime&Page=2',
		'http://m.yingjiesheng.com/recommendlist.php?Action=PartTime&Page=3',
		'http://m.yingjiesheng.com/recommendlist.php?Action=PartTime&Page=4',
		'http://m.yingjiesheng.com/recommendlist.php?Action=PartTime&Page=5',
		'http://m.yingjiesheng.com/recommendlist.php?Action=PartTime&Page=6'
	];
	var yjs_xuanjiang_urls = [
		'http://m.yingjiesheng.com/xjh.php?Location=13&keyword=',
		'http://m.yingjiesheng.com/xjh.php?Location=13&keyword=&city=0&school=0&Page=2',
		'http://m.yingjiesheng.com/xjh.php?Location=13&keyword=&city=0&school=0&Page=3',
		'http://m.yingjiesheng.com/xjh.php?Location=13&keyword=&city=0&school=0&Page=4',
		'http://m.yingjiesheng.com/xjh.php?Location=13&keyword=&city=0&school=0&Page=5',
		'http://m.yingjiesheng.com/xjh.php?Location=13&keyword=&city=0&school=0&Page=6'
	]
	//大街网，仅抓取广州和深圳的招聘信息
	var djw_xiaozhao_urls = [];
	var djw_shixi_urls = [];
	function setPageNum(num){
		num = parseInt(num);
		for (var i = 1; i <= num; i++) {
			djw_xiaozhao_urls.push("http://campus.dajie.com/progress/index/ajaxSearch?ajax=1&refer=cindex&page="+i+"&city=440100&_CSRFToken=ZEuX39rckKwAeMLcP___GsxPct8ccyc4RxAxLAHG");//广州
			djw_xiaozhao_urls.push("http://campus.dajie.com/progress/index/ajaxSearch?ajax=1&refer=cindex&page="+i+"&city=440300&_CSRFToken=ZEuX39rckKwAeMLcP___GsxPct8ccyc4RxAxLAHG");//深圳

			djw_shixi_urls.push("http://m.dajie.com/job/ajax/intern?positionfunction=&city=440100&salary=&degree=&page="+i);
		}
	}
	setPageNum(4);
	//获得包含所有链接的数组
	var xiaozhao_total_urls = yjs_xiaozhao_urls.concat(djw_xiaozhao_urls);
	var shixi_total_urls = yjs_shixi_urls.concat(djw_shixi_urls);
	var xuanjiang_total_urls = yjs_xuanjiang_urls;

	//获取m端大街网的cookie
	var djw_headers = {
	    "Accept": 'application/json',
	    'Accept-Encoding': 'gzip, deflate, sdch',
	    'Accept-Language': 'zh-CN,zh;q=0.8',
	    "Cache-Control":"max-age=0",
	    "Connection":"Keep-Alive",
	    "Host":"m.dajie.com",
	    "Referer": 'http://m.dajie.com/job/intern',
	    "Upgrade-Insecure-Requests":"1",
	    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 8_0 like Mac OS X) AppleWebKit/600.1.3 (KHTML, like Gecko) Version/8.0 Mobile/12A4345d Safari/600.1.4',
	    "X-Requested-With:": "XMLHttpRequest"
	};

	/*
	 *	抓取招聘信息
	 *	开始
	 */
	superagent.get("http://m.dajie.com/job/ajax/intern")
		.set(djw_headers)
		.redirects(0)
		.end(function(err, res){
			var cookieStr="";
			var cookies = res.headers['set-cookie'];
			cookies.forEach(function(value){
				cookieStr += value.slice(0,value.indexOf("Domain"));
			})
			djw_shixi_urls.forEach(function(totalUrl){
				superagent.get(totalUrl)
					.set("Cookie",cookieStr)
					.set(djw_headers)
					.redirects(0)
					.end(function(err, res){
						if (res.statusCode === 302) {
							superagent.get(totalUrl)
								.set("Cookie",cookieStr)
								.set(djw_headers)
								.redirects(0)
								.end(function(err, res){
									console.log("fetch"+totalUrl+"success");
									shixi_ep.emit("shixi_html",res.text);
								})
						}else{
							console.log("fetch"+totalUrl+"success");
							shixi_ep.emit("shixi_html",res.text);
						}
					})
			})	
		});
	/* 
	 *
	 *爬取数据
	 *
	 */
	/*
	 * 再抓取校招信息
	 */
	var xiaozhao_ep = new eventproxy();
	xiaozhao_total_urls.forEach(function(totalUrl){
	  superagent.get(totalUrl)
	    .end(function(err,res){
	      console.log("fetch"+totalUrl+"success");
	      xiaozhao_ep.emit("xiaozhao_html",res.text);
	    })
	});

	xiaozhao_ep.after("xiaozhao_html",xiaozhao_total_urls.length,function(recruitsMsg){
	  recruitsMsg.map(function(recruitMsg){
	  	//爬取开始
	    
	    try{
	    	var parseJSON = JSON.parse(recruitMsg).data;
	    }catch(err){
	    	console.log(err);
	    }
	  	if (parseJSON) {
	  		//大街网
	  		for (var i = 0; i < parseJSON.lists.length; i++) {
	  			var XIAOZHAO_list = new XIAOZHAO({ company: parseJSON.lists[i].name, workPlace: parseJSON.lists[i].city, pubTime:parseJSON.lists[i].startTime, link:parseJSON.lists[i].url, top:parseJSON.lists[i].up});

	  			// 调用 .save 方法后，mongoose 会去你的 mongodb 中的 test 数据库里，存入一条记录。
	  			XIAOZHAO_list.save(function (err) {
	  			  if (err) return err.message;
	  			  // console.log();
	  			});
	  		}
	  		
	  	}else{
		    var $ = cheerio.load(recruitMsg);
		    //应届生求职
		    $('.list.link_visit').children("li").each(function() {
		    	var workPlace = $(this).children("a").find("span:last-child").text();
		    	if (workPlace.indexOf("广东")!==-1 || 
		    		workPlace.indexOf("广州")!==-1 || 
		    		workPlace.indexOf("深圳")!==-1 || 
		    		workPlace.indexOf("东莞")!==-1 || 
		    		workPlace.indexOf("汕头")!==-1 || 
		    		workPlace.indexOf("揭阳")!==-1 || 
		    		workPlace.indexOf("肇庆")!==-1 || 
		    		workPlace.indexOf("佛山")!==-1) 
		    	{
					var link = $(this).children("a").attr("href");
					var linkStart = link.indexOf("RedirectUrl=");
					if (linkStart !== -1) {
						link = link.slice(linkStart+12);
					}else{
						link = url.resolve("http://m.yingjiesheng.com",link);
					}
					
					var company = $(this).find("span.list_l").text();
					var top = false;
					if (company.indexOf("[顶]") !== -1) {
						top=true;
						company = company.replace("[顶]","");
					}
					company = company.slice(company.lastIndexOf(" "));
					var pubTime = $(this).find("span.time").text();
					

				    // new 一个新对象，名叫 XIAOZHAO_list
				    // 接着为 XIAOZHAO_list 的属性们赋值
				    var XIAOZHAO_list = new XIAOZHAO({ company: company, workPlace: workPlace, pubTime:pubTime, link:link, top:top});

				    // 调用 .save 方法后，mongoose 会去你的 mongodb 中的 test 数据库里，存入一条记录。
				    XIAOZHAO_list.save(function (err) {
				      if (err) return err.message;
				      // console.log();
				    });
		    	}else return;
		    });
	  	}
	  });
	  console.log("done");
	  allDone.emit("xiaozhao");
	})

	/*
	 * 再抓取宣讲会信息
	 */
	var xuanjiang_ep = new eventproxy();
	xuanjiang_total_urls.forEach(function(totalUrl){
	  superagent.get(totalUrl)
	    .end(function(err,res){
	      console.log("fetch"+totalUrl+"success");
	      xuanjiang_ep.emit("xuanjiang_html",res.text);
	    })
	});

	xuanjiang_ep.after("xuanjiang_html",xuanjiang_total_urls.length,function(recruitsMsg){
	  recruitsMsg.map(function(recruitMsg){
	  	//爬取开始
	    var $ = cheerio.load(recruitMsg);
	    //应届生求职
	    $('.list.link_visit').children("li").each(function() {
	    	var workPlace = $(this).find("br").next().text().replace("» ","");
			var link = $(this).children("a").attr("href");
			var linkStart = link.indexOf("RedirectUrl=");
			if (linkStart !== -1) {
				link = link.slice(linkStart+12);
			}else{
				link = url.resolve("http://m.yingjiesheng.com",link);
			}
			
			var company = $(this).find("a>span:first-child").text().replace("» ","");
			var startTime = $(this).find("br").next().next().children("img").attr("src");
			var posDetail = $(this).find("a").text().replace("» ","");
			var pubTime = $(this).find("br").prev().children("img").attr("src");
			

		    // new 一个新对象，名叫 XUANJIANG_list
		    // 接着为 XUANJIANG_list 的属性们赋值
		    var XUANJIANG_list = new XUANJIANG({ company: company, workPlace: workPlace, pubTime:pubTime, link:link, posDetail:posDetail, startTime:startTime});

		    // 调用 .save 方法后，mongoose 会去你的 mongodb 中的 test 数据库里，存入一条记录。
		    XUANJIANG_list.save(function (err) {
		      if (err) return err.message;
		    });
	    });
	  });
	  console.log("done");
	  allDone.emit("xuanjiang");
	})

	/*
	 * 再抓取实习信息
	 */
	var shixi_ep = new eventproxy();
	yjs_shixi_urls.forEach(function(totalUrl){
		superagent.get(totalUrl)
			.end(function(err, res){
				console.log("fetch"+totalUrl+"success");
				shixi_ep.emit("shixi_html",res.text);
			})
	})
	shixi_ep.after("shixi_html",shixi_total_urls.length,function(recruitsMsg){
	  recruitsMsg.map(function(recruitMsg){
	  	//爬取开始
	    try{
	    	var parseJSON = JSON.parse(recruitMsg).data;
	    }catch(err){
	    	console.log(err);
	    }
	  	if (parseJSON) {
	  		//大街网
	  		for (var i = 0; i < parseJSON.list.length; i++) {
	  			var SHIXI_list = new SHIXI({ company: parseJSON.list[i].corp, workPlace: parseJSON.list[i].keywords[0], job:parseJSON.list[i].title, link:url.resolve("http://m.dajie.com/job/intern",parseJSON.list[i].url), top:parseJSON.list[i].vip});

	  			// 调用 .save 方法后，mongoose 会去你的 mongodb 中的 test 数据库里，存入一条记录。
	  			SHIXI_list.save(function (err) {
	  			  if (err) return err.message;
	  			});
	  		}
	  	}else{
		    var $ = cheerio.load(recruitMsg);
		    //应届生求职
		    $('.list.link_visit').children("li").each(function() {
		    	var workPlace = $(this).children("a").find("span:last-child").text();
		    	if (workPlace.indexOf("广东")!==-1 || 
		    		workPlace.indexOf("广州")!==-1 || 
		    		workPlace.indexOf("深圳")!==-1 || 
		    		workPlace.indexOf("东莞")!==-1 || 
		    		workPlace.indexOf("汕头")!==-1 || 
		    		workPlace.indexOf("揭阳")!==-1 || 
		    		workPlace.indexOf("肇庆")!==-1 || 
		    		workPlace.indexOf("佛山")!==-1) 
		    	{
					var link = $(this).children("a").attr("href");
					var linkStart = link.indexOf("RedirectUrl=");
					if (linkStart !== -1) {
						link = link.slice(linkStart+12);
					}else{
						link = url.resolve("http://m.yingjiesheng.com",link);
					}
					
					var company = $(this).find("span.list_l").text();
					var top = false;
					if (company.indexOf("[顶]") !== -1) {
						top=true;
						company = company.replace("[顶]","");
					}
					company = company.slice(company.lastIndexOf(" "));
					var pubTime = $(this).find("span.time").text();
					

				    // new 一个新对象，名叫 SHIXI_list
				    // 接着为 SHIXI_list 的属性们赋值
				    var SHIXI_list = new SHIXI({ company: company, workPlace: workPlace, link:link, top:top});

				    // 调用 .save 方法后，mongoose 会去你的 mongodb 中的 test 数据库里，存入一条记录。
				    SHIXI_list.save(function (err) {
				      if (err) return err.message;
				    });
		    	}else return;
		    });
	  	}
	  });
	  console.log("done");
	  allDone.emit("shixi");
	})
	/*
	 *	抓取招聘信息
	 *	结束
	 */
	var allDone = new eventproxy();
	allDone.all("shixi","xuanjiang","xiaozhao",function(){
		response.send("数据更新完成！");
	})
}
