var USERMSG = require('../../../db').USERMSG;
var express = require('express');
var superagent = require('superagent');
var cheerio = require('cheerio');

/***********************************************
    message为音频内容
    { ToUserName: 'gh_d3e07d51b513',
    FromUserName: 'oPKu7jgOibOA-De4u8J2RuNKpZRw',
    CreateTime: '1359125022',
    MsgType: 'voice',
    MediaId: 'OMYnpghh8fRfzHL8obuboDN9rmLig4s0xdpoNT6a5BoFZWufbE6srbCKc_bxduzS',
    Format: 'amr',
    MsgId: '5837397520665436492' }
************************************************/
var HandleVoice = exports.HandleVoice = function(message, req, res, next){
    
}