## 介绍：

用`typescript`写的用于下载图片的小巧的`node`爬虫程序。

需要先下载好[nodejs](https://nodejs.org/en/#:~:text=18.12.1%20LTS,For%20Most%20Users)并创建环境变量

### 用法：

1. 拉取代码
   ```shell
   git clone https://github.com/aaroncastle/captureImages.git
   cd captureImages
   npm install 
   ```

2. 在`src/main.js`文件中写入想爬取的页面，可以是网站的主入口也可以是想爬取的单页面，如果是主入口`Spider.entry`函数只需要入口站点一个参数即可，如果非入口，需要第二个参数，类型是`number`,值与你的**工作流**有关，反向截取工作流。

3. 以程序所在路径打开`terminal`，windows电脑可以用`cmd` 或 `powershell`(直接在程序所在的文件夹地址栏里写`cmd`即以程序为路径打开`cmd`) 或先打开`terminal` 再用 `cd`命令进入到本程序所在的文件夹
4. 运行`node src/main.js`即可

### 编写工作流：

1. 工作流由用户自定义，并放在`config.json`文件中。

2. `config.json`对象由两部分组成：

   - `destination`: 它代表下载的文件存放目录，默认是`resource`，并放在程序的根目录`resource`下。它可以被自定义，自定义要用**绝对路径**。最终的存放流程是`存放目录 > 爬取的网站域名 > [ 循环分类 ] > 图片(包含同一分类下所有分页)`
   - 要爬取的域名 ：它由用户自定义的域名，值是一个对象，我们姑且称它为**域名对象**。

3. 域名对象的组成：

   | 属性      | 值      | 默认  | 是否必需 | 说明                                                         |
   | --------- | ------- | ----- | -------- | ------------------------------------------------------------ |
   | cookie    | String  | 无    | 否       | 有些网站只能登陆后访问，如果网站设置了cookie，则必需填写     |
   | pageSign  | String  | 无    | 否       | 用于爬虫核心在分页时判断是否是css selector填写错误或是该页面下只有一个页面 |
   | workflows | Array   | 无    | 是       | 爬虫的爬取流程，每一个值是一个**工作流对象**，对象的多少由站点的嵌套决定 |
   | timeout   | Number  | 1500  | 否       | 有些页面打开速度较慢，可以自由设置超时时间。单位是毫秒。超过超时时间程序会报错停止。 |
   | async     | Boolean | false | 是       | 用于在爬取同一页面的图片时是否使用同步方式。同步方式是爬取完一张后再爬取另一张。异步是同一页面的图片一起爬取。此处的同步与异步是计算机中的同步与异步是指代码执行过程的同异步。未有编程经历的使用者需注意。 |

4. 工作流对象的组成：

   | 属性          | 值                         | 默认 | 是否必需 | 说明                                                         |
   | ------------- | -------------------------- | ---- | -------- | ------------------------------------------------------------ |
   | type          | "category" \| "pagination" | 无   | 是       | 用于区分是分类还是分页                                       |
   | selector      | String                     | 无   | 是       | 用于选择分类或分页（由type决定）的css 选择器                 |
   | titleSelector | String                     | 无   | 是       | 用于以标题区分不同的类型，最终用来创建对象                   |
   | included      | Array                      | 无   | 否       | 用于指定只爬取哪些分类页面，优先级高于`excluded`             |
   | excluded      | Array                      | 无   | 否       | 用于指定排除哪些页面，如果有included，excluded的值不可以与excluded有交集，否则默认不爬取该页面。 |
   | attr          | String                     | 无   | 是       | 用于指定爬取页面的链接元素的attribute属性，有些网站的html编码并非相同，这将需要在每一工作对象中指定，虽然为了这些站点指定attr很痛苦，但放在每一工作流中很有效。 |
   | next          | String                     | 无   | 否       | 用于指定**分页工作**流中总页数选择器的辅助selector。在某些网站中，特别是某些没有采用现代框架或组件编写的前端页面中，某些总页码总是很诡异且随心所欲地跳来跳去，next将用于在selector中选择子级元素。对于非子级元素将由各个工作流对象中的selector锁定 |
   | reg           | String                     | 无   | 是       | 用于分类工作流对象捕获的分布模版根据总页码数替换页码的正则表达式前缀。由于种种原因，某些网站各级页面的分页query或params各不相同，特别是一些由后端人员编写的没有经过统一规划杂乱无章的前端页面无法用统一的正则表达式匹配替换页码，而由各个工作流来指定将是个非常有效且有针对性的选择 |

   > 工作流对象是一个非常不错工作模块。它对于非编程人员来说，不是很容易接受与理解。但对于爬虫程序的稳健性是个非常不错的选择。它将各个不同网站不同页面的不同情况做了分离处理，并与核心模块解耦。
   
   最终一个完整的工作流大约是这样的：
   ```json
   {
     "destination": "resource",
     "timeout": 150000,
     "sync": false,
     "www.exam.com": {
       "cookie": "ID=qvm25n6cbuq5ten5q5950;logged_in_52b660f28afb5e4963cee681ee4229=te%7C167637d4568%7Cx3MHpDwq6w29LhioKxf1P94KGbQsknQ9Onp3sdfrntudHdy%7C2334425d3af6d17f1d0c741e468dcb5cfa2c721b4889df6d9652a37910f13dd970",
       "pageSign": "page-numbers",
       "workflow": [
         {
           "type": "category",
           "selector": "li[id^=menu-item-].menu-item-type-tarmy a",
           "titleSelector": "span.font-text",
           "excluded": [
             "https://www.exam.com/download/"
           ],
           "included": [
             "https://www.exam.com/%E4%B8%BE%E4%B8%AA%E6%A0%97%E5%AD%90/"
           ],
           "attr": "href"
         },
         {
           "type": "pagination",
           "selector": "#picture  div.nav-link > a:nth-last-of-type(2)",
           "titleSelector": "#page > nav span.current",
           "attr": "href",
           "reg": "/page/"
         },
         {
           "type": "category",
           "selector": "article[id^=post-] > div > div.link > a",
           "titleSelector": "#article[id^=post-] > div > h2 > a[rel=title]",
           "attr": "href"
         },
         {
           "type": "pagination",
           "selector": "article[id^=post-] > div > div.links > a:nth-last-of-type(2)",
           "attr": "href",
           "titleSelector": "#page > nav span.current",
           "next": "span",
           "reg": "html/"
         },
         {
           "type": "category",
           "selector": "article[id] > div > div.single-content > p img",
           "titleSelector": "#page > nav span.current",
           "attr": "src"
         }
       ]
     }
   }
   ```
   
   入口程序的运行逻辑就是将工作流反向截取。
   例子：
   
   > 假设你要爬取网站是 https://www.photos.com/cars/page/68，并且你只写了想爬取页面的对应的工作流，那么就没必要截取，参数只写要爬取的入口站点一个参数即可。
   > 如果你为这个 www.photos.com 从站点的起始到包含图片的最终页面的工作流都配置在了config.json
   > 那么你将不得不为了只得到这个 https://www.photos.com/cars/page/68 页面上的图片而截取工作流，截取的值是1 。
   >
   > 如果要将所有和这个页面类似的分页页面都爬取，（从页面上看你的入口页面是第68页）,你将需要截取最后两个工作流，倒数第二个的类型是分页（pagination）如下面的例子所示。
   
   ```javascript
   /* lib/src/main.js(ts编译之后的发布版本文件) 或 src/main.ts 中 */
   import { Spider } from "./core/Spider.js";
   const entry = 'https://www.photos.com/cars/page/68'
   await Spider.entry(entry,2)
   ```
   

### 缓存：

1. 已经爬取过的图片地址，会缓存在`src/log/history.image`文件内。它用于杜绝在同一文件夹下的不必要的重复爬取。
2. 所有解析过的站点都会缓存，缓存目录为`src/cache/cache.json`，它对于某些未知原因造成的程序中断后再次运行提供快速反应能力，并减轻对爬取的网站流量压力。

### 错误日志：

​	某些情况下，比如工作流的编写错误造成的程序中断。想要查看对应的工作流对象与页面，便于再次改写工作流对象可以在`src/logs/error.log`下找到它。它记录了正在爬取的页面(page)和css 选择器(selector)以及工作流对象的type值。这些将为定位排错提供依据。

### 关于栈溢出的报错：

​	通常不建议将一个网站的入口程序做为爬取的入口站点，即使你已经编写了完整的工作流。因为一个完整的网站可能分支过大，每个分支的分页过多。很大可能会造成栈溢出并报错。这不是由于程序内的错误递归引发的，而是由于不同操作系统分配的栈大小决定的。那么你将有必要更改系统的栈大小，但这不是一个好主意，也不推荐这么做。建议将某个分类作为爬取的入口是个明智的选择。

### 许可证：

​	本程序遵循MIT开源协议，已在License协议文件中声明。
