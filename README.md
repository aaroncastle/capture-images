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

2. 在`src/main.js`文件中`Spider.entry`函数只需要入口站点一个参数即可按照`config.json`中对应的工作流**顺序**爬取内容，如果入口站点与工作流不一致，则需要第二个参数，类型是`number`,值是入口站点的对应**工作流**的倒数排序值。

3. 以程序所在路径打开`terminal`，windows电脑可以用`cmd` 或 `powershell`(直接在程序所在的文件夹地址栏里写`cmd`即以程序为路径打开`cmd`) 或先打开`terminal` 再用 `cd`命令进入到本程序所在的文件夹，运行`npm install`或任意钟爱的包管理器安装依赖。
4. 运行`node src/main.js`即可

### 编写工作流：

1. 工作流由用户自定义，并放在`config.json`文件中。

2. `config.json`对象由以下部分组成：

   - `destination`: 它代表下载的文件存放目录，默认是`resource`，并放在程序的根目录`resource`下。它可以被自定义，自定义要用**绝对路径**。最终的存放流程是`存放目录 > 爬取的网站域名 > [ 循环分类 ] > 图片(包含同一分类下所有分页)`
   - timeout: 网站的访问超时时间，单位毫秒。
   - 要爬取的域名 ：它由用户自定义的域名，值是一个对象，我们姑且称它为**域名对象**。

3. 域名对象的组成：

   | 属性      | 值              | 默认 | 是否必需 | 说明                                                         |
   | --------- | --------------- | ---- | -------- | ------------------------------------------------------------ |
   | cookie    | String          | 无   | 否       | 有些网站只能登陆后访问，如果网站设置了cookie，则必需填写     |
   | token     | [String,String] | 无   | 否       | 有些网站只能登陆后访问，如果网站设置了token，则必需填写。第0位是`key`,第1位是`value` |
   | pageSign  | String          | 无   | 否       | 用于爬虫核心在分页时判断是否是css selector填写错误或是该页面下只有一个页面 |
   | workflows | Array           | 无   | 是       | 爬虫的爬取流程，每一个值是一个**工作流对象**，对象的多少由站点的嵌套决定 |
   | timeout   | Number          | 0    | 否       | 有些页面打开速度较慢，可以自由设置超时时间。单位是毫秒。超过超时时间程序会报错停止。优先级大于`config.json`中的`timeout` |

   > 本版本废弃了`0.1.0版本`中的`async`属性。因为默认的`sync`会造成系统的栈溢出，特别是要爬取的站点分类多、每个分类下的分页多、分页下的每个分类…… 从`0.1.1版本`开始采用`Promise.all`一并返回。
   >
   > 为了使报错不中断并发爬取，所有`catch`都会被捕获并记录在`src/logs/error.log`中

4. 工作流对象的组成：

   | 属性          | 值                         | 默认 | 是否必需 | 说明                                                         |
   | ------------- | -------------------------- | ---- | -------- | ------------------------------------------------------------ |
   | type          | "category" \| "pagination" | 无   | 是       | 用于区分是分类还是分页                                       |
   | selector      | String                     | 无   | 是       | 用于选择分类或分页（由type决定）的css 选择器                 |
   | titleSelector | String                     | 无   | 是       | 用于以标题区分不同的类型，最终用来创建对象                   |
   | included      | Array                      | 无   | 否       | 用于指定只爬取哪些分类页面，优先级高于`excluded`             |
   | excluded      | Array                      | 无   | 否       | 用于指定排除哪些页面，如果有included，excluded的值不可以与excluded有交集，否则默认不爬取该页面。 |
   | attr          | String                     | 无   | 是       | 用于指定爬取页面的链接元素的attribute属性，有些网站的html编码并非相同，这将需要在每一工作对象中指定，虽然为了这些站点指定attr很痛苦，但放在每一工作流中很有效。 |
   | next          | String                     | 无   | 否       | 用于指定**分页工作**流中总页数选择器的辅助selector。在某些网站中，总页码有可能因为分类的层级不同而不一致。next将用于在selector中选择子级元素的辅助选择器。对于非子级元素将由各个工作流对象中的selector锁定 |
   | reg           | String                     | 无   | 是       | 用于分类工作流对象捕获的分布模版根据总页码数替换页码的正则表达式前缀。由于种种原因，某些网站各级页面的分页query或params各不相同，无法使用一条完整的正则表达式匹配替换页码，而由各个工作流来指定将是个非常有效且有针对性的选择 |

   > 工作流对象是一个非常不错工作模块。它对于非编程人员来说，不是很容易接受与理解。但对于爬虫程序的稳健性是个非常不错的选择。它将各个不同网站不同页面的不同情况做了分离处理，并与核心模块解耦。
   
   最终一个完整的工作流大约是这样的：
   ```json
   {
     "destination": "resource",
     "timeout": 1500,
     "sync": false,
     "www.exam.com": {
       "cookie": "ID=qvm25n6cbuq5ten5q5950;logged_in_52b660f28afb5e4963cee681ee4229=te%7C167637d4568%7Cx3MHpDwq6w29LhioKxf1P94KGbQsknQ9Onp3sdfrntudHdy%7C2334425d3af6d17f1d0c741e468dcb5cfa2c721b4889df6d9652a37910f13dd970",
       "timeout": 150000,
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

​	从`0.1.1`版本开始，不再采用缓存。因为多并发的爬取会对缓存写入脏数据。

### 错误日志：

​	某些情况下，比如工作流的编写错误造成的程序中断。想要查看对应的工作流对象与页面，便于再次改写工作流对象可以在`src/logs/error.log`下找到它。它记录了正在爬取的页面(page)和css 选择器(selector)以及工作流对象的type值。这些将为定位排错提供依据。大部分情况下是因为目标服务器的响应超时引起的，这也会记录在`src/logs/error.log`中。

​	**警告**⚠️：**不恰当的`timeout`设置将导致页面无法加载使程序无法采集到对应元素而引发爬取的图片不全。**

### 关于栈溢出的报错：

​	从`0.1.1`版本开始将不再采用同步爬取，所以这种错误已不会再发生。

### 许可证：

​	本程序遵循MIT开源协议，已在License协议文件中声明。
