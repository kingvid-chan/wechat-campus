var USERMSG = require('../../db').USERMSG;
var express = require('express');
var bodyParser = require('body-parser');
var cheerio = require('cheerio');
const charset = require('superagent-charset');
const superagent = require('superagent');
charset(superagent);
var getIndexCookie = require('./getData').getIndexCookie;

/*************************************************************************************************************
 * A Router is like a mini express app.                                                                      *
 * It contains no views or settings but does provide the typical routing APIs (.use, .get, .param, .route).  *
 * Apps and Routers can also .use() other routers                                                            *
 * which allows you to create files that export a router to organize your apps better.                       *
 *************************************************************************************************************
 */
var login = express.Router();

login.use(bodyParser());
/*POST请求表示用户第一次输入学号密码进行登陆操作
 *GET请求表示用户账号密码已经存在数据库，但是cookie过期或者用户修改了密码导致登录不成功
 */
login.route('/')
	.post(function(req, response, next){
	    var userNumber = req.body.userNumber,
	        password = req.body.password,
            openId = req.session.openId,
            password_jwxt = req.body.password_jwxt;
        if (!password_jwxt) {
            //模拟登陆信息门户，检验学号密码是否正确
            getIndexCookie(openId, userNumber, password, function(cookie_index){
                if (cookie_index) {
                    validate_jwxt(userNumber, password, response, cookie_index);
                }else{
                    response.render("login.ejs",{err:"err", notTheSame:undefined, userNumber:undefined});
                }
            })
        }else{
            var userNumber = req.body.userNumber_backup;
            validate_jwxt(userNumber, password_jwxt, response);
        }
        
        //模拟登陆教务系统，检验学号密码是否正确
        function validate_jwxt(userNumber, password, response, cookie_index){
            superagent.get("http://jwxt2.gdufe.edu.cn:8080")
                .end(function(err, res){
                    var r_url = res.redirects[0];
                    var key = r_url.slice(r_url.indexOf("("),r_url.lastIndexOf(")")+1);
                    var url_str = 'http://jwxt2.gdufe.edu.cn:8080/'+key+'/default2.aspx';
                    superagent.post(url_str)
                        .charset('gbk')
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
                            if (res.redirects.length>0) {
                                var $ = cheerio.load(res.text);
                                var userNameText = $("#xhxm").text().replace(/[^\u4E00-\u9FA5]/g,'');
                                var userName = userNameText.replace('同学','');
                                response.render("index.ejs",{userName:userNameText});
                                if (cookie_index) {
                                    USERMSG
                                        .findOneAndUpdate({openId:openId},{cookie_jwxt:key, cookie_index:cookie_index, userNumber:userNumber,password:password,password_jwxt:password, userName:userName},function(err){
                                            if (err) {console.log("update database ERR!")}
                                        })
                                }else{
                                    USERMSG
                                        .findOneAndUpdate({openId:openId},{cookie_jwxt:key,password_jwxt:password, userName:userName},function(err){
                                            if (err) {console.log("update database ERR!")}
                                        })
                                    }
                            }else{
                                if (cookie_index) {
                                    response.render("login.ejs",{err:"",notTheSame:true, userNumber:userNumber});
                                    USERMSG
                                        .findOneAndUpdate({openId:openId},{cookie_index:cookie_index, userNumber:userNumber,password:password},function(err){
                                            if (err) {console.log("update database ERR!")}
                                        })
                                }else{
                                    response.render("login.ejs",{err:"err",notTheSame:true, userNumber:userNumber});
                                }
                            }
                        })
                })
        }
	})
	.get(function(req, res, next){
        openId = req.session.openId;
		res.render("login.ejs",{err:'',notTheSame:undefined, userNumber:undefined});
	});

module.exports.login = login;