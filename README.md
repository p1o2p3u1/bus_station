## Bus Station

Bus station for all the regular buses. Display the python coverage result in real time.

## Snapshot
![](http://git.163-inc.com/ting.wu/bus_station/raw/master/docs/result.png)
如果要使用函数调用图的绘图功能，需要在游戏服务器上安装绘图工具，安装方式为
```
sudo apt-get install graphviz libgraphviz-dev pkg-config
```
![](http://git.163-inc.com/ting.wu/bus_station/raw/master/docs/call_graph.png)
## Setup

1. Choose a project to test.
2. Install regularbus and gas_station for it.
3. open and edit `app.config` to connect to your own database. You can find the sql script in gas_station project.
4. `python server.py` and enjoy.

## More info

Please visit wiki: http://git.163-inc.com/ting.wu/bus_station/wikis/home