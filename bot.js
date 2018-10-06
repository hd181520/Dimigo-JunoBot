var Discord = require('discord.io');
var logger = require('winston');
var auth = require('./auth.json');
var cheerio = require('cheerio');
var request = require('request');
var moment = require('moment');
var fs = require('fs');

// Configure logger settings
logger.remove(logger.transports.Console);
logger.add(logger.transports.Console, {
    colorize: true
});
logger.level = 'debug';

// Initialize Discord Bot
var bot = new Discord.Client({
    token: auth.token,
    autorun: true
});

bot.on('ready', function (evt) {
    logger.info('Connected');
    logger.info('Logged in as: ');
    logger.info(bot.username + ' - (' + bot.id + ')');
});

function getMeal(name, code, day, channelID){
    request('https://stu.goe.go.kr/sts_sci_md01_001.do?schulCode=' 
        + code + '&&schulCrseScCode=3&schMmealScCode=2&schYmd=' 
        + moment().add(day, 'days').format('YYYY.MM.DD')
    , function(error, response, html){
        var $ = cheerio.load(html, { decodeEntities: false });
        var meal = $('tbody > tr:nth-child(2)').children('td').eq(moment().add(day, 'days').day());
        if (meal.html() == ' '){ bot.sendMessage({ to: channelID, message: '급식 정보가 없습니다.' }); }
        else { 
            bot.sendMessage({ 
                to: channelID, 
                message: meal.html().replace(/([0-9]|1[0-5])\.|\(중\)/g, '').replace(/<br>/g, '\n').trim()
            }); 
        }
    });
    var obj = JSON.parse(fs.readFileSync('code.json', 'utf8'));
    if (!obj.hasOwnProperty(name)) {
        obj[name] = code;
        const ordered = {};
        Object.keys(obj).sort().forEach(function(key) {
            ordered[key] = obj[key];
        });
        fs.writeFile('code.json', JSON.stringify(ordered), function(err) {
            if (err) { console.log(err); }
        }); 
    } 
}

bot.on('message', function (user, userID, channelID, message, evt) {
    // Our bot needs to know if it needs to execute a command
    // for this script it will listen for messages that will start with `!`
    if (message.substring(0, 1) == '!') {
        var args = message.substring(1).split(' ');
        var cmd = args[0];

        args = args.splice(1);

        switch(cmd) {
            // !ping
            case '급식':
                var obj = JSON.parse(fs.readFileSync('code.json', 'utf8'));
                if (!['오늘', '내일', '모레'].includes(args[1])) {
                    bot.sendMessage({ to: channelID, message: '`!급식 [학교이름] [오늘/내일/모레]` 형태로 입력해 줘!' });
                    break;
                }
                var day = {'오늘':0, '내일':1, '모레':2}[args[1]]
                if (obj.hasOwnProperty(args[0])) {
                    getMeal(args[0], obj[args[0]], day, channelID);
                }
                else {
                    logger.info('query : ' + args[0])
                    request.post({
                        url: 'https://www.meatwatch.go.kr/biz/bm/sel/schoolListPopup.do',
                        form: {'criteria': 'pageIndex=1&bsnmNm=' + encodeURIComponent(args[0])}
                    }, function(error, response, body){
                        var $ = cheerio.load(body, { decodeEntities: false });
                        getMeal(
                            args[0], 
                            $('.grid1 > table > tbody > tr > td:nth-child(3)').text().slice(0, 10), 
                            day, channelID
                        );                      
                    });
                }
                break;
            default:
                bot.sendMessage({ to: channelID, message: '그런 명령은 없어...' });
        }
    }
})
