# Web监控评测工具

用于自动化评测网页性能和稳定性的工具

## Install
```
npm i -g web-monitor-tester
```

## Usage

查看命令帮助
```
wmt -h
```


## Example
```bash
// 对指定URL 评测1次，指定特定的useragent
wmt https://m.baidu.com -c 1 -u "Mozilla/5.0 (Linux; Android 8.1.0; PBCM10 Build/OPM1.171019.011; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/63.0.3239.83 Mobile Safari/537.36 T7/11.3 baiduboxapp/11.23.0.0 (Baidu; P1 8.1.0)"
```
执行完后，会在当前目录输出html文件，打开即可查看执行结果



## Use Programmatically
```js
const webMonitorTester = require('web-monitor-tester');
// 更多参数请看源码
const {taskResults, error} = await webMonitorTester({
    urls: ['https://m.baidu.com'],
    count: 1
});
if (!error) {
    console.log('taskResults', taskResults);
}
```