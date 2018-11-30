const token = require('./auth.json').token;
var request = require('request');
var cheerio = require('cheerio');
const Discord = require('discord.js');
const client = new Discord.Client();
var xml2js = require('xml2js');
var parser = new xml2js.Parser();

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', msg => {
    if (msg.content === '안녕') {
        msg.reply('나도 안녕');
    }
    else if (msg.content === '급식' || msg.content === '학식') {
        const today = new Date()
        var title = `${today.getMonth() + 1}월 ${today.getDate()}일 식단입니다.`
        request({
            url: 'https://www.dimigo.hs.kr/index.php', 
            qs: {
                'mid': 'school_cafeteria',
                'page': 1
            }
        }, function(err, response, html) {
            if(err) { 
                msg.channel.send('연결 중 에러가 발생했습니다.');
                return; 
            }
            var $ = cheerio.load(html, { decodeEntities: false });
            var post = $('tbody[id=dimigo_post_cell_2] > tr > td[class=title] > div > a').filter(function() {
                return $(this).text().trim() === title;
            }).attr('href');
            request(post, function(err, response, html){
                var $ = cheerio.load(html, { decodeEntities: false });
                const table = $('ul[class=scFrm] > li > div > div')
                msg.channel.send({embed: {
                    color: 15466636,
                    description: `디미고 **${today.getMonth() + 1}월 ${today.getDate()}일** 학식입니다.`,
                    fields: [
                        {
                            name: '아침(조식)',
                            value: table.find('p:nth-child(1)').text().replace('조식: ', '')
                        },
                        {
                            name: '점심(중식)',
                            value: table.find('p:nth-child(3)').text().replace('중식: ', '')
                        },
                        {
                            name: '저녁(석식)',
                            value: table.find('p:nth-child(5)').text().replace('석식: ', '')
                        }
                    ]
                }})
            });
        });
    }
    else if (msg.content === '날씨') {
        request('http://www.kma.go.kr/wid/queryDFSRSS.jsp?zone=4127351000', function(err, response, html) {
            parser.parseString(html, function(err, result) {
                var weather_info = result.rss.channel[0].item[0].description[0].body[0].data[0];

                var tmp_max = weather_info.tmx[0] + '도';
                if (tmp_max === '-999.0도') tmp_max = '데이터 없음'

                var tmp_min = weather_info.tmn[0] + '도';
                if (tmp_min === '-999.0도') tmp_min = '데이터 없음'
                
                msg.channel.send({embed: {
                    color: 10104574,
                    description: `오늘 ${weather_info.hour[0]}시 기준 **경기도 안산시 단원구 와동** 날씨(예상)입니다.`,
                    fields: [
                        {
                            name: '현재 온도',
                            value: weather_info.temp[0] + '도'
                        },
                        {
                            name: '최고 온도',
                            value: tmp_max
                        },
                        {
                            name: '최저 온도',
                            value: tmp_min
                        },
                        {
                            name: '하늘 상태',
                            value: ['맑음', '구름 조금', '구름 많음', '흐림'][Number(weather_info.sky[0])]
                        },
                        {
                            name: '강수 상태',
                            value: ['없음', '비', '비/눈', '눈/비', '눈'][Number(weather_info.pty[0])]
                        },
                        {
                            name: '강수 확률',
                            value: weather_info.pop[0] + '%'
                        },
                        {
                            name: '습도',
                            value: weather_info.reh[0] + '%'
                        }
                    ]
                }})
            });
        })
    }
});

client.login(token);
