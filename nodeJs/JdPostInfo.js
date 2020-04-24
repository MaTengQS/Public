let xlsx = require("node-xlsx"),
  superagent = require("superagent"),
  cheerio = require("cheerio"),
  async = require("async"),
  eventproxy = require("eventproxy"),
  fs = require("fs"),
  ep = new eventproxy();
class httpJd {
  constructor() {
    this.cookie =
      "pinId=XW68Nu2qGmGEk0uX-PLEZQ; shshshfpa=35c65f35-fbfc-31a0-084d-3d81d0e32849-1532340078; shshshfpb=0f76f77587c93a29320609ea2d7d34ee9b5210c4c5b2fe3705b55a76fa; __jdu=15706706254472077587557; __jdv=76161171|baidu|-|organic|jd|1587041577670; areaId=1; ipLoc-djd=1-72-55653-0; PCSYCityID=CN_110000_110100_0; __jdc=122270672; 3AB9D23F7A4B3C9B=P2VJHWOVND34A6WBYPHKFYB6GQBVO6CM5ROJV5TGIE23GNSPPY5PSI5SSEJFSA3CUEJJM7ZJMAGPXOY4D5DJIYKSO4; pin=%E8%A8%80%E6%97%A0%E4%BA%8C%E4%B8%89; unick=%E8%A8%80%E6%97%A0%E4%BA%8C%E4%B8%89kqe; _tp=dW1lWT2P6ONlU%2BRYnVxXP6fZeLYfRbx4PfQplaJ19wQ8%2FaLRQh1QNvD6ohUIp0BC; _pst=%E8%A8%80%E6%97%A0%E4%BA%8C%E4%B8%89; wlfstk_smdl=n61oe7xg37oekm9tz99kzg89hooj19eo; TrackID=1-XTsXOgl3G8YZqRumptiT1wJP1X2y2jExzHVZ8fAn3q5TOqTm44odmIZCX5BmYL70CshnfCkSBpDgS-tiRL9wCnliKQFwsCmTPIMTQf1NVgr36KbeHxNU_vFxxadd4IN; ceshi3.com=103; shshshfp=74201c95fad7a98afbaadcd39976cd2b; __jda=122270672.15706706254472077587557.1570670625.1587696106.1587710470.13; thor=0FB9E2BB61774EDFC9B90EF6267D755C14048760F707D697F5BE4D8CC72D54679EA1163D0CA8B7F2D8C7B1B75DD513D7D450FDB682C9228D4F32E9EDE64AA3AD57042E852F3BC9E1E6732B35B2CEB45E107A67FE52BDAA38109FA9680AFBA29DAC25334EB1C0B472D64BA0A4E4BD783CC56161EB7C613904C1255479EEB48EA4; __jdb=122270672.16.15706706254472077587557|13.1587710470";
    this.urlsArray = [];
    this.pageNum = 1;
    this.count = 0;
    this.order_config = "";
    this.url = "https://order.jd.com/center/list.action?search=0&d=2&s=1024`";
    this.init();
  }
  init() {
     xlsx.parse("./xlsx/2968ef5f5e1e60c0.xlsx")
     console.log(xlsx.parse("./xlsx/2968ef5f5e1e60c0.xlsx"))
    // console.log(this.cookie);
    let _this = this;
    superagent
      .get(_this.url)
      .set("Cookie", _this.cookie)
      .end((err, pres) => {
        let $ = cheerio.load(pres.text);
        _this.pageNum = $(".current:last-of-type").text();
        for (let i = 0; i < _this.pageNum; i++) {
          _this.url = `https://order.jd.com/center/list.action?search=${i}&d=2&s=1024`;
          _this.urlsArray.push(_this.url);
          ep.emit("getUrl", _this.url);
        }
      });
    ep.after("getUrl", _this.pageNum, (urls) => {
      // console.log(urls);
      async.mapLimit(urls, 5, (url, callback) => {
        _this.getTable(url);
      });
    });
  }
  getTable(url) {
    let _this = this;
    let delay = parseInt((Math.random() * 30000000) % 100, 10);
    _this.count++;
    console.log(`并发数:${_this.count},当前路径:${url},执行时间:${delay}`);
    superagent
      .get(url)
      .set("Cookie", _this.cookie)
      .end((err, pres) => {
        let $ = cheerio.load(pres.text),
          script = $("script");
        for (let i = 0; i < script.length; i++) {
          if (script.eq(i).html().indexOf("$ORDER_CONFIG") > -1) {
            let orders = script.eq(i).html();
            if (fs.existsSync("./ORDER_CONFIG.js")) {
              fs.unlink("./ORDER_CONFIG.js", (err) => {
                _this.writeFile(orders);
              });
            } else {
              _this.writeFile(orders);
            }
          }
          console.log($(".number a").eq(i).text());
        }
      });
  }
  writeFile(orders) {
    let _this = this;
    fs.writeFile("./ORDER_CONFIG.js", orders, { flag: "a" }, function (err) {
      fs.appendFile(
        "./ORDER_CONFIG.js",
        "module.exports = $ORDER_CONFIG",
        (msg) => {
          let obj;
          _this.order_config = require("./ORDER_CONFIG.js");
          obj = JSON.parse(_this.order_config.pop_sign);
          obj.forEach((element) => {
            element.erpOrderId = element.orderIds[0];
            delete element.orderIds;
          });
          superagent
            .get(
              `https://ordergw.jd.com/orderCenter/app/1.0/?callback=jQuery6730173&queryList=${escape(
                JSON.stringify(obj)
              )}&_=${new Date().valueOf()}`
            )
            .set("Cookie", _this.cookie)
            .end((err, pres) => {
              let arr = err.rawResponse
                .split("")
                .splice("jQuery6730173".length);
              arr.pop();
              arr.shift();
              JSON.parse(arr.join(""));
            });
        }
      );
    });
  }
}
const main = new httpJd();
