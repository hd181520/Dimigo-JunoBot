var Discord = require('discord.io');
var logger = require('winston');
var auth = require('./auth.json');
var cheerio = require('cheerio');
var request = require('request');
var moment = require('moment');

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
                var fs = require('fs');
                var obj = JSON.parse(fs.readFileSync('code.json', 'utf8'));
                if (obj.hasOwnProperty(args[0])) {
                    var code = obj[args[0]]
                    var day = args[1]
                    request('https://stu.goe.go.kr/sts_sci_md01_001.do?schulCode=' + code + '&&schulCrseScCode=3&schMmealScCode=2&schYmd=' + moment().format('YYYY.MM.DD'), function(error, response, html){
                        var $ = cheerio.load(html, { decodeEntities: false });
                        var meal = $('tbody > tr:nth-child(2)').children('td').eq(day)
                        bot.sendMessage({ to: channelID, message: meal.html() })
                    });
                }
                else {
                    request.post({
                        url: 'https://www.meatwatch.go.kr/biz/bm/sel/schoolListPopup.do',
                        form: {'criteria': 'pageIndex=1&bsnmNm=' + encodeURIComponent(args[0])}
                    }, function(error, response, body){
                        var $ = cheerio.load(body, { decodeEntities: false });
                        var code = $('.grid1 > table > tbody > tr > td:nth-child(3)').text().slice(0, 10)
                        var day = args[1]
                        request('https://stu.goe.go.kr/sts_sci_md01_001.do?schulCode=' + code + '&&schulCrseScCode=3&schMmealScCode=2&schYmd=' + moment().format('YYYY.MM.DD'), function(error, response, html){
                            var $ = cheerio.load(html, { decodeEntities: false });
                            var meal = $('tbody > tr:nth-child(2)').children('td').eq(day)
                            bot.sendMessage({ to: channelID, message: meal.html() })
                        });
                        // var obj = JSON.parse(fs.readFileSync('code.json', 'utf8'));
                        obj[args[0]] = code;
                        fs.writeFile('code.json', JSON.stringify(obj), function(err) {
                            if (err) {
                                console.log(err);
                            }
                        });                        
                    });
                }
                break;
            default:
                bot.sendMessage({ to: channelID, message: '어, 아니야.' });
        }
    }
})
