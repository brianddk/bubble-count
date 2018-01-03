// [rights]  Copyright Dan B. (brianddk) 2017 https://github.com/brianddk
// [license] Licensed under Apache 2.0 https://www.apache.org/licenses/LICENSE-2.0
// [repo]    https://github.com/brianddk/bubble-count
// [tips]    LTC: LQjSwZLigtgqHA3rE14yeRNbNNY2r3tXcA
//
var rp = require('request-promise');
var cheerio = require('cheerio')

// Globals (parameterize later).
var bMarkdown = true;; // else CSV
var bTruncate = true;; // only list < $1

const numberWithCommas = (x, n) => {
    return x.toFixed(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

const usDateFormat = (d) => {
    return (d.getMonth()+1) + "/" + d.getDate() + "/" + d.getFullYear();
}

function jsonReq(url, bParse) {
    return rp({
        uri: url,
        headers: {
            'User-Agent': 'Request-Promise'
        },
        json: bParse
    });
} 

function findBubble(history, indicator) {
    var ringer = {date: new Date('12/22/2017'), price: 10400.00};
    var atl = {date: "", price: 0};
    var ath = {date: "", price: 0};
    var inBubble = true;
    var badInvest = 1.0;
    var goodInvest = 5;
    //http://web.archive.org/web/20100703032414/http://freebitcoins.appspot.com/
    for(var i in history) {
        // if (i > 100) {continue;}
        var current = {};
        var theEnd = false;
        current.date  = new Date(history[i][0]);
        current.price = history[i][1];
        var delta = current.date - ringer.date;
        var oneDay = 24*60*60*1000;
        if(delta > 0 && delta < oneDay ) {
            current.price = ringer.price;
        }
        if(inBubble) {
            if(current.price <= ath.price * (1 - indicator)) {
                inBubble = false;
                atl = current;
            }            
        } else {
            if(current.price < atl.price) {
                atl = current;
            }
        }
        
        if(Number(i)+1 == history.length) {
            theEnd = true;
        }
        
        if(current.price > ath.price || theEnd) {
            if(!inBubble) {
                var drop = 100 - (atl.price / ath.price)*100;
                var dropMsg = numberWithCommas((current.date.getTime() - ath.date.getTime()) / (1000*60*60*24*30.5), 2) + " mo|"
                if (theEnd) { dropMsg = "NA|" }
                var msg = "ATH = " + ath.price + " @ " + usDateFormat(ath.date);
                msg += "\nATL = " + atl.price + " @ " + usDateFormat(atl.date);
                msg += "\nDROP = " + drop.toFixed(2) + " %";
                msg = "|$"+ numberWithCommas(ath.price, 2) +"|"+ usDateFormat(ath.date) +"|$"+ 
                      numberWithCommas(atl.price, 2) +"|"+ usDateFormat(atl.date) +"|"+ drop.toFixed(2) +"%|" + 
                      dropMsg;
                console.log(msg);
                badInvest *= (1-drop/100);
                goodInvest *= 1/(1-drop/100);
            }
            if(current.price > ath.price) {
                ath = current;
                inBubble = true;
            }
        }
    }
    console.log("ATH $" + ath.price + " @ " + usDateFormat(ath.date));
    console.log("1 MIL USD invested poorly (buy top / sell bottom) = $" + numberWithCommas(badInvest * 1000 * 1000, 2));
    console.log("5 BTC from an [early faucet](http://web.archive.org/web/1/http://freebitcoins.appspot.com/) invested wisely (sell top / buy bottom) = $" + numberWithCommas(goodInvest * ath.price, 2));
}

jsonReq('https://99bitcoins.com/price-chart-history/', false)
    .then(function (historyHtml) {
        var $ = cheerio.load(historyHtml);
        var $scripts = $("script");
        var pricedata = {};
        $scripts.each(function (i) {
            var js = $(this).html();
            if(0 > js.indexOf("var chartdata =")) {
                return;
            } 
            eval(js);
            pricedata = chartdata;
        });
        findBubble(pricedata.price, 0.05);
        // console.log(pricedata.price);
    });
