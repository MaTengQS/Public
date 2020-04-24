let http = require("http"),
  url = require("url"),
  superagent = require("superagent"),
  cheerio = require("cheerio"),
  async = require("async"),
  eventproxy = require("eventproxy");
let ep = new eventproxy(),
  urlsArray = [],
  pageUrls = [],
  pageNum = 1;
for (let i = 1; i <= pageNum; i++) {
  // pageUrls.push("https://www.cnblogs.com/#p" + i);
  pageUrls.push(
    "http://www.cnblogs.com/?CategoryId=808&CategoryType=%22SiteHome%22&ItemListActionName=%22PostList%22&PageIndex=" +
      i +
      "&ParentCategoryId=0"
  );
}

const start = () => {
  let onRequest = (req, res) => {
    res.writeHead(200, {
      "Content-Type": "text/plain;charset=utf-8",
    });
    pageUrls.forEach((pageUrl) => {
      superagent.get(pageUrl).end((err, pres) => {
        let $ = cheerio.load(pres.text),
          curPageUrls = $(".titlelnk");
        console.log("curPageUrls");
        console.log($);

        for (let i = 0; i < curPageUrls.length; i++) {
          let articleUrl = curPageUrls.eq(i).attr("href");
          urlsArray.push(articleUrl);
          console.log("articleUrl");
          ep.emit("BlogArticleHtml", articleUrl);
        }
      });
    });
    ep.after("BlogArticleHtml", pageNum * 20, (articleUrls) => {
      // res.write("<br/>");
      // res.write("success <br/>");
      // res.write("articleUrls.length is " + articleUrls.length);
      let curCount = 0;
      let reptileMove = (url, callback) => {
        let delay = parseInt((Math.random() * 30000000) % 100, 10);
        curCount++;
        console.log(`并发数:${curCount},当前路径:${url},执行时间:${delay}`);
        console.log(url);
        let currentBlogApp = url.split("/p/")[0].split("/")[3],
          appUrl = `https://www.cnblogs.com/${currentBlogApp}/ajax/news.aspx`;
        superagent.get(appUrl).end((err, sres) => {
          let $ = cheerio.load(sres.text);
          res.write($("a").text());
          console.log(res);
          // res.end();
        });
        setTimeout(() => {
          curCount--;
          callback(null, url + "Call back content");
        }, delay);
      };
      async.mapLimit(articleUrls, 5, (url, callback) => {
        reptileMove(url, callback);
      });
    });
    ep.group("BlogArticleHtml", () => {
      res.end();
    });
  };
  http.createServer(onRequest).listen(3000);
};
start();
