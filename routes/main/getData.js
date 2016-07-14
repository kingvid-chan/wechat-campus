var USERMSG = require('../../db').USERMSG;
var CookieToStr = require('./CookieParser').CookieToStr;
var CookieToJSON = require('./CookieParser').CookieToJSON;
var superagent = require('superagent');
var fs = require('fs');
var tesseract = require('node-tesseract');

//获取信息门户的cookie值，适用于用户第一次登陆时以及信息门户cookie过期时
var getIndexCookie = exports.getIndexCookie = function (openId, userNumber, password, callback){
    /******************************
     *"GET"获取"cookie"值          *
     ******************************/
     var HeadersForCookie = {
         'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
         'Accept-Encoding':'gzip, deflate, sdch',
         'Accept-Language':'zh-CN,zh;q=0.8',
         'Cache-Control':'max-age=0',
         'Connection':'keep-alive',
         'Host':'my.gdufe.edu.cn',
         'Upgrade-Insecure-Requests':'1',
         'User-Agent':'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.106 Safari/537.36'
     }
     //通过HeadersForCookie返回的cookie值来获取captcha
     var HeadersForCaptcha = {
         'Accept':'image/webp,image/*,*/*;q=0.8',
         'Accept-Encoding':'gzip, deflate, sdch',
         'Accept-Language':'zh-CN,zh;q=0.8',
         'Cache-Control':'max-age=0',
         'Connection':'keep-alive',
         'Host':'my.gdufe.edu.cn',
         'Referer':'http://my.gdufe.edu.cn/',
         'User-Agent':'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.106 Safari/537.36'
     }
     //通过HeadersForCookie返回的cookie值来进行用户信息的验证和登陆
     var HeadersForLogin = {
         'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
         'Accept-Encoding':'gzip, deflate',
         'Accept-Language':'zh-CN,zh;q=0.8',
         'Cache-Control':'max-age=0',
         'Connection':'keep-alive',
         'Content-Length':'179',
         'Content-Type':'application/x-www-form-urlencoded',
         'Host':'my.gdufe.edu.cn',
         'Origin':'http://my.gdufe.edu.cn',
         'Referer':'http://my.gdufe.edu.cn/',
         'Upgrade-Insecure-Requests':'1',
         'User-Agent':'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.106 Safari/537.36'
     }
     //验证captcha是否正确的headers
     var HeadersForCheckCaptcha = {
         'Accept':'text/javascript, text/html, application/xml, text/xml, */*',
         'Accept-Encoding':'gzip, deflate, sdch',
         'Accept-Language':'zh-CN,zh;q=0.8',
         'Connection':'keep-alive',
         'Host':'my.gdufe.edu.cn',
         'Referer':'http://my.gdufe.edu.cn/',
         'User-Agent':'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.106 Safari/537.36',
         'X-Prototype-Version':'1.5.0',
         'X-Requested-With':'XMLHttpRequest'
     }
    //模拟登陆,①获取cookie
    superagent.get("http://my.gdufe.edu.cn/")
        .set(HeadersForCookie)
        .redirects(0)
        .end(function(err, sres){
            if (err) {return err.message}
            var resCookies = {};
        	CookieToJSON(sres.headers['set-cookie'],resCookies);
            HeadersForCaptcha.Cookie = HeadersForLogin.Cookie = HeadersForCheckCaptcha.Cookie = CookieToStr(resCookies);
            //②根据cookie获取captcha
            function getCaptcha(){
                var captchaUrl = "http://my.gdufe.edu.cn/captchaGenerate.portal?s="+Math.random();
                var path = "./public/captcha/captcha"+Math.floor(Math.random()*1000)+".jpg";
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
                                superagent.get("http://my.gdufe.edu.cn/captchaValidate.portal")
                                    .set(HeadersForCheckCaptcha)
                                    .query({captcha:captcha, what:"captcha", value:captcha, _:""})
                                    .end(function(err, sres){
                                        if (sres.text === "验证码非法") {
                                            getCaptcha();
                                        }else{
                                            superagent.post("http://my.gdufe.edu.cn/userPasswordValidate.portal")
                                                .set(HeadersForLogin)
                                                .send({"Login.Token1": userNumber, "Login.Token2": password, captchaField:captcha, goto:"http://my.gdufe.edu.cn/loginSuccess.portal", gotoOnFail:"http://my.gdufe.edu.cn/loginFailure.portal"})
                                                .end(function(err, sres){
                                                    if (err) {return err.message};
                                                    if (sres.text.indexOf("LoginSuccess")!==-1) {
                                                    	CookieToJSON(sres.headers['set-cookie'],resCookies);
                                                        var Cookie = CookieToStr(resCookies);
                                                        callback(Cookie);
                                                    }else{
                                                        callback(false);
                                                    }
                                                })
                                        }
                                    })
                            }
                        }
                    });
                })                
            }
            getCaptcha();
        })
}
