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
    // var ringer = {date: new Date('1/17/2018'), price: 9017.41};
    var inBubble = true;
    var badInvest = 1.0;
    var goodInvest = 5;
    //http://web.archive.org/web/20100703032414/http://freebitcoins.appspot.com/
    for(var i in history) {
        // if (i > 100) {continue;}
        var current = {};
        var theEnd = false;
        current.date  = new Date(history[i][0]);
        current.low = history[i][1];
        current.high = history[i][1];
        if(i == 0) {
            atl = current;
            ath = current;
        }
        // var delta = typeof(ringer) === 'undefined' ? 0 : current.date - ringer.date;
        // var oneDay = 24*60*60*1000;
        // if(delta > 0 && delta < oneDay ) {
            // current.price = ringer.price;
        // }
        if(inBubble) {
            if(current.low <= ath.low * (1 - indicator)) {
                inBubble = false;
                atl = current;
            }
            else;
        } else {
            if(current.low < atl.low) {
                atl = current;
            }
        }
        
        if(Number(i)+1 == history.length) {
            theEnd = true;
        }
        
        if(current.high > ath.high || theEnd) {
            if(!inBubble) {
                var drop = 100 - (atl.low / ath.high)*100;
                var dropMsg = numberWithCommas((current.date.getTime() - ath.date.getTime()) / (1000*60*60*24*30.5), 2) + " mo|"
                if (theEnd) { dropMsg = "NA|" }
                var msg = "ATH = " + ath.high + " @ " + usDateFormat(ath.date);
                msg += "\nATL = " + atl.low + " @ " + usDateFormat(atl.date);
                msg += "\nDROP = " + drop.toFixed(2) + " %";
                msg = "|$"+ numberWithCommas(ath.high, 2) +"|"+ usDateFormat(ath.date) +"|$"+ 
                      numberWithCommas(atl.low, 2) +"|"+ usDateFormat(atl.date) +"|"+ drop.toFixed(2) +"%|" + 
                      dropMsg;
                console.log(msg);
                badInvest *= (1-drop/100);
                goodInvest *= 1/(1-drop/100);
            }
            if(current.high > ath.high) {
                ath = current;
                inBubble = true;
            }
        }
    }
    console.log("ATH $" + numberWithCommas(ath.high, 2) + " @ " + usDateFormat(ath.date));
    console.log("1 MIL USD invested poorly (buy top / sell bottom) = $" + numberWithCommas(badInvest * 1000 * 1000, 2));
    console.log("5 BTC from an [early faucet](http://web.archive.org/web/1/http://freebitcoins.appspot.com/) HODL'd till last dip = $" + 
                numberWithCommas(5 * atl.low, 2));
    console.log("5 BTC from an [early faucet](http://web.archive.org/web/1/http://freebitcoins.appspot.com/) invested wisely (sell top / buy bottom) = $" + 
                numberWithCommas(goodInvest * ath.high, 2));
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
            pricedata = chartdata.price;
        });
        jsonReq('https://api.gdax.com/products/BTC-USD/candles?granularity=86400', true)
            .then(function(gdax){
                for(var i in gdax){
                    if(gdax[i][0] == 1492214400) {
                        gdax[i][1] = gdax[i][3];
                    }
                    gdax[i][0] *= 1000;
                }
                for(var i in pricedata) {
                    var price = pricedata[i][1];
                    pricedata[i].push(price);
                    gdax.push(pricedata[i])
                }
                gdax.sort(function(a, b){
                    return a[0] - b[0]
                });
                findBubble(gdax, 0.45);                
            });
    });
