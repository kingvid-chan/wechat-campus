var USERMSG = require('../../../db').USERMSG;
var express = require('express');
var superagent = require('superagent');
var cheerio = require('cheerio');

/********************************************************
    message为文本内容
    { ToUserName: 'gh_d3e07d51b513',
    FromUserName: 'oPKu7jgOibOA-De4u8J2RuNKpZRw',
    CreateTime: '1359125035',
    MsgType: 'text',
    Content: 'http',
    MsgId: '5837397576500011341' }
********************************************************/
var HandleText = exports.HandleText = function(message, req, res, next){
    var txt = message.Content;
    if (txt.indexOf("暂无法显示") !== -1) {
        res.reply("您是不是发了什么有趣的表情，小蜜看不到/:8*/:8*/:8*");
    } else if (txt === "游戏") {

    }else{
        var url = "http://www.niurenqushi.com/app/simsimi/ajax.aspx?datatype=js&txt=" + encodeURIComponent(txt);
        superagent.get(url).end(function(err, super_res) {
            if (err) {
                return next(err);
            }
            var newMsg = super_res.text.slice(8, -2);
            if (newMsg.indexOf("图灵机器人")!==-1) {
                newMsg.replace("图灵机器人","小蜜");
            }
            console.log(message.Content,newMsg);
            res.reply(newMsg);
        })
    }
}