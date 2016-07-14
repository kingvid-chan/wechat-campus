var USERMSG = require('../../../db').USERMSG;
var express = require('express');
var session = require('express-session');
var superagent = require('superagent');
var cheerio = require('cheerio');

/***********************************************
    message为链接内容
    { ToUserName: 'gh_d3e07d51b513',
    FromUserName: 'oPKu7jgOibOA-De4u8J2RuNKpZRw',
    CreateTime: '1359125022',
    MsgType: 'link',
    Title: '公众平台官网链接',
    Description: '公众平台官网链接',
    Url: 'http://1024.com/',
    MsgId: '5837397520665436492' }
************************************************/
var HandleLink = exports.HandleLink = function(message, req, res, next){
    
}