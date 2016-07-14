var USERMSG = require('../../db').USERMSG;
var superagent = require('superagent');
var getIndexCookie = require('./getData').getIndexCookie;

var checkIndexCookie = exports.checkIndexCookie = function(cookie, openId, userNumber, password, callback, URL){
	//设置模拟登陆HEAD
	if (!cookie) {
		getIndexCookie(openId, userNumber, password, function(newCookie){
			cookie_index = newCookie;
		    callback(newCookie);
		    USERMSG.findOneAndUpdate({openId:openId},{cookie_index:newCookie},function(err){if(err){console.log('updateERROR')}})
		})
		return;
	}
	var Headers = {
	    'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	    'Accept-Encoding':'gzip, deflate, sdch',
	    'Accept-Language':'zh-CN,zh;q=0.8',
	    'Connection':'keep-alive',
	    'Host':'my.gdufe.edu.cn',
	    'Cookie': cookie,
	    'Upgrade-Insecure-Requests':'1',
	    'User-Agent':'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.106 Safari/537.36'
	}
	superagent.get("http://my.gdufe.edu.cn/index.portal")
        .set(Headers)
        .end(function(err, sres){
            if (err) {return err.message}
            if (sres.headers['cache-control'].indexOf("set-cookie")!==-1) {
                getIndexCookie(openId, userNumber, password, function(newCookie){
                    callback(newCookie);
                    cookie_index = newCookie;
                    USERMSG.findOneAndUpdate({openId:openId},{cookie_index:newCookie},function(err){if(err){console.log('updateERROR')}})
                })
            }else{
                callback(cookie);
            }
        })
}

var checkCookie = exports.checkCookie = function(cookie, url, callback){
	if (!cookie) {
		callback(false);
		return;
	}
	var Headers = {
	    'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	    'Accept-Encoding':'gzip, deflate, sdch',
	    'Accept-Language':'zh-CN,zh;q=0.8',
	    'Connection':'keep-alive',
	    'Cookie': cookie,
	    'Upgrade-Insecure-Requests':'1',
	    'User-Agent':'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.106 Safari/537.36'
	}
	superagent.get(url)
        .set(Headers)
        .end(function(err, sres){
            if (err) {return err.message}
            if (sres.redirects.length>0) {
                callback(false);
            }else{
               	callback(true)
            }
        })
}