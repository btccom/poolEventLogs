# BTC Pool Event Logs

Transfer event logs to browser for faster debug/monitor mining status.

## Development

Recommend to use [Yarn](http://yarnpkg.com/) as package manager, which is much faster than npm.

### Install

* NodeJS 6+

```shell
npm install -g yarn
git clone git@github.com:btccom/poolEventLogs.git
cd poolEventLogs
yarn install
```

### Build

```
yarn build
```

## Run

```shell
# copy a config file
cp .env.example .env
# edit config
vim .env
# build & run
node build/bin/run.js
```