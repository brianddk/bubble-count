// [rights]  Copyright Dan B. (brianddk) 2017 https://github.com/brianddk
// [license] Licensed under Apache 2.0 https://www.apache.org/licenses/LICENSE-2.0
// [repo]    https://github.com/brianddk/bubble-count
// [tips]    LTC: LQjSwZLigtgqHA3rE14yeRNbNNY2r3tXcA
//
var rp = require('request-promise');
var fs = require('fs');
var earlyA = require('./99bitcoins.json');
var cmcA = require('./cmc.json');

// Globals (parameterize later).
var bMarkdown = true;; // else CSV
var bTruncate = true;; // only list < $1
var step = 1000*340*86400;
var start = cmcA.slice(-1)[0][0];
var pct = 0.45;
var head;

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

function fetchGdax(head, start) {
    var uri = "https://api.gdax.com/products/BTC-USD/candles?granularity=86400";
    var end = Math.min(start + step, new Date().getTime()-12345); // 12 sec delay
    uri += "&start=" + new Date(start).toISOString();
    uri += "&end="  + new Date(end).toISOString();
    if(head) {
        return head
            .then(function(prev){
                return jsonReq(uri, true)
                    .then(function(cur){
                        return prev.concat(cur);
                    });
            });
    }
    else {
        return jsonReq(uri, true);
    }
}


function findBubble(history, indicator) {
    var inBubble = true;
    var badInvest = 1.0;
    var goodInvest = 5;
    //http://web.archive.org/web/20100703032414/http://freebitcoins.appspot.com/
    for(var i in history) {
        var current = {};
        var theEnd = false;
        current.date  = new Date(history[i][0]);
        current.low = history[i][1];
        current.high = history[i][2];
        if(i == 0) {
            atl = current;
            ath = current;
        }
        if(inBubble) {
            if(current.low <= ath.high * (1 - indicator)) {
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
                // var msg = "ATH = " + ath.high + " @ " + usDateFormat(ath.date);
                // msg += "\nATL = " + atl.low + " @ " + usDateFormat(atl.date);
                // msg += "\nDROP = " + drop.toFixed(2) + " %";
                var msg = "|$"+ numberWithCommas(ath.high, 2) +"|"+ usDateFormat(ath.date) +"|$"+
                      numberWithCommas(atl.low, 2) +"|"+ usDateFormat(atl.date) +"|"+ drop.toFixed(2) +"%|" +
                      dropMsg;
                // msg += numberWithCommas((atl.date.getTime() - ath.date.getTime()) / (1000*60*60), 2) + " hr|"
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

for(var i=start; i < new Date().getTime(); i += step) {
    head = fetchGdax(head, i);
}

head
    .then(function(gdax){
        for(var i in gdax) {
            gdax[i][0] *= 1000;
        }
        gdax = gdax.concat(earlyA).concat(cmcA);
        for(var i in gdax){
            gdax.sort(function(a, b){
                return a[0] - b[0]
            });
        }
        
        if (process.argv.length > 2) pct = process.argv[2] / 100;
        findBubble(gdax, pct);
    });
