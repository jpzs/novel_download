# novel_download
爬取在线阅读的小说，节省寻找下载方式的时间
# 使用环境
windows操作系统
nodejs
# 安装使用说明
1.  下载代码
2.  dos命令进入所在目录，执行 
    ```bash
    npm install 
    ```
    安装nodejs项目所需依赖.
3.  执行 
    ```bash
    node server.js 
    ```
    命令，运行程序，默认8080端口启动，以默认浏览器打开操作网页
4.  在网页上输入框内输入小说首页的地址(该地址打开的页面需要能看到小说所有章节)，点击加载按钮，出现小说所有章节的目录，点击最上方的checkbox选框，全选所有地址，也可以在右边的输入框中输入开始序号和结束序号进行部分选中或取消的操作。在有选中值的情况下，点击下载按钮进行下载的操作。