var USERMSG = require('../../../db').USERMSG;
var express = require('express');
var superagent = require('superagent');
var cheerio = require('cheerio');
var getBasicInfo = require('../../main/card').getBasicInfo;

/************************************************
    message为事件内容
    { ToUserName: 'gh_d3e07d51b513',
    FromUserName: 'oPKu7jgOibOA-De4u8J2RuNKpZRw',
    CreateTime: '1359125022',
    MsgType: 'event',
    Event: 'LOCATION',
    Latitude: '23.137466',
    Longitude: '113.352425',
    Precision: '119.385040',
    MsgId: '5837397520665436492' }
*************************************************/
var HandleEvent = exports.HandleEvent = function(message, req, res, next){
    if (message.Event === 'subscribe') {
            // 用户添加时候的消息
            res.reply('欢迎关注广财大校园信息门户查询微信服务号\ni小蜜是智能机器人哦，来调戏下我吧/::$');
            new USERMSG({openId: message.FromUserName}).save(function(err){
                if (err) {return err.message}
            });
        } else if (message.Event === 'unsubscribe') {
            res.reply('Bye!');
            USERMSG.findOneAndRemove({openId:message.FromUserName})
                .exec(function(err){
                    if (err) {return err.message}
                    console.log('delete done');
                })
        } else {
            var openId = message.FromUserName;
            USERMSG
                .findOne({openId: openId})
                .exec(function(err, usermsg){
                    if (usermsg===null) {
                        var str = '<a href="http://chenqingwei.com/main/login?openId='+openId+'">=。=不如先点我绑定一下？</a>';
                        res.reply(str);
                        new USERMSG({openId: openId}).save(function(err){
                            if (err) {console.log('user login insert data ERR')}
                        });
                    }else{
                        var userNumber = usermsg.userNumber;
                        if (!userNumber) {
                            var str = '<a href="http://chenqingwei.com/main/login?openId='+openId+'">=。=不如先点我绑定一下？</a>';
                            res.reply(str);
                        }else{
                            var userName = usermsg.userName,
                                _id = usermsg._id,
                                password = usermsg.password,
                                cookie_card = usermsg.cookie_card,
                                cookie_index = usermsg.cookie_index;
                            switch(message.EventKey){
                                case "course":  
                                    var getTodaysCourse = require('../../main/jwxt').getTodaysCourse;
                                    getTodaysCourse(openId, function(_courses){
                                        var courses = "";
                                        if (_courses.length===0) {
                                            courses='恭喜你！你今天没有课程'
                                        }else{
                                            for (var i = 0; i < _courses.length; i++) {
                                                var text = _courses[i].replace('<br>','（');
                                                text = text.replace('<br>','）\n');
                                                text = text.replace('<br>','\n');
                                                text = text.replace('<br>','\n');
                                                var pos = text.indexOf('<br>');
                                                if (i===_courses.length-1) {
                                                    if (pos!==-1) {
                                                        courses += text.slice(0,pos);
                                                    }else{
                                                        courses += text;
                                                    }
                                                }else{
                                                    if (pos!==-1) {
                                                        courses += text.slice(0,pos)+'\n\n';
                                                    }else{
                                                        courses += text+'\n\n';
                                                    }
                                                }
                                            }
                                        }
                                        res.reply([
                                            {
                                                title: "今日课程",
                                                description: courses,
                                                picurl: '',
                                                url: 'http://chenqingwei.com/main/course?openId='+openId
                                            }
                                        ]);
                                    })
                                    break;
                                case "GPA":
                                    res.reply([
                                        {
                                            title: "成绩",
                                            description: "选择对应的学年和学期，可查询当前学期的所有课程成绩，系统会帮你自动计算绩点",
                                            picurl: '',
                                            url: 'http://chenqingwei.com/main/GPA?openId='+openId
                                        }
                                    ]);
                                    break;
                                case "levelscore":  
                                    res.reply([
                                        {
                                            title: "等级考试",
                                            description: "可查询大学四年所有等级考试成绩",
                                            picurl: '',
                                            url: 'http://chenqingwei.com/main/levelscore?openId='+openId
                                        }
                                    ]);
                                    break;
                                case "card":
                                    getBasicInfo(cookie_index, cookie_card, openId, userNumber, password, function(result, new_cookie_card, newCookie_index){
                                        if (new_cookie_card) {
                                            USERMSG.findOneAndUpdate({openId:openId},{cookie_index:newCookie_index,cookie_card:new_cookie_card},{new:true},function(err, usermsg){
                                                if (err) {return err.message}
                                            });
                                        }
                                        var str = "余额："+result.money_less+'\n卡状态：'+result.state+'\n冻结状态：'+result.ice_state+'\n挂失状态：'+result.lost_state+'\n检查状态：'+result.check_state+'\n点击可查看历史交易明细';
                                        res.reply([
                                            {
                                                title: "一卡通",
                                                description: str,
                                                picurl: '',
                                                url: 'http://chenqingwei.com/main/card/thisDay?openId='+openId
                                            }
                                        ]);
                                    });
                                    break;
                                case "lending":  
                                    res.reply([
                                        {
                                            title: '当前借阅',
                                            description: '点击可查看当前借阅书籍详情',
                                            picurl: '',
                                            url: 'http://chenqingwei.com/main/library/lending?openId='+openId
                                        }
                                    ]);
                                    break;
                                case 'report':
                                    res.reply([
                                        {
                                            title: '记忆图书馆',
                                            description: '点击可查看借阅历史图形报告',
                                            picurl: '',
                                            url: 'http://chenqingwei.com/main/library/report?_id='+_id
                                        }
                                    ]);
                                    break;
                                case 'bookSearch':
                                    res.reply([
                                        {
                                            title: '图书馆书目检索',
                                            description: '点击进入图书馆首页',
                                            picurl: '',
                                            url: 'http://chenqingwei.com/main/library?openId='+openId
                                        }
                                    ]);
                                    break;
                            }
                        }
                    }
                })
            
        }
}