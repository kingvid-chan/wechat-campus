var USERMSG = require('../../../db').USERMSG;
var express = require('express');
var superagent = require('superagent');
var cheerio = require('cheerio');

/***********************************************
    message为图片内容
    { ToUserName: 'gh_d3e07d51b513',
    FromUserName: 'oPKu7jgOibOA-De4u8J2RuNKpZRw',
    CreateTime: '1359124971',
    MsgType: 'image',
    PicUrl: 'http://mmsns.qpic.cn/mmsns/bfc815ygvIWcaaZlEXJV7NzhmA3Y2fc4eBOxLjpPI60Q1Q6ibYicwg/0',
    MediaId: 'media_id',
    MsgId: '5837397301622104395' }
************************************************/
var HandleImage = exports.HandleImage = function(message, req, res, next){
    res.reply("您是不是发了图片");
}