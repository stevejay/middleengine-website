---
layout: post
title: Using Phantom.js with AWS Lambda
summary: How to run the Phantom.js headless browser application within an AWS Lambda instance.
date: 2017-03-22
author:
  name: Steve Johns
  url: https://www.linkedin.com/in/stephen-johns-47a7568/
heroImage:
  source: Unsplash
  id: tzQkuviIuHU
---

I am currently doing some Web scraping and I wanted to take the approach of using AWS Lambda to run my Node.js scraper code.
Normally using [cheerio](https://github.com/cheeriojs/cheerio) to parse a given Web page is sufficient, but this approach does not work for single page applications; you need to use a headless browser since JavaScript needs to execute to construct the page. I decided to use the [Horseman](https://github.com/johntitus/node-horseman) npm package for this purpose, which requires that you include the [PhantomJS](https://phantomjs.org/) binary file in some way. The PhantomJS _README_ file suggests using the [phantomjs-prebuilt](https://www.npmjs.com/package/phantomjs-prebuilt) package, an approach that worked locally but failed when I deployed my Lambda. The binary file used needs to be compatible with the AWS Lambda servers and this was not the case. This post details how I resolved the issue.

## Getting the PhantomJS binary

I first downloaded and unzipped a prebuilt phantomjs package from [this bitbucket repo](https://bitbucket.org/ariya/phantomjs/downloads/). You need a suitable Linux x86 64 bit package; the latest stable release at the time of writing was _phantomjs-2.1.1-linux-x86_64.tar.bz2_. The file in the unzipped package that you require is the _bin/phantomjs_ file; I copied this to a _bin_ directory in the root of my Lambda directory; you can basically put this file where you like in your Lambda directory.

## Including PhantomJS in the Lambda package

I use [Serverless](https://www.serverless.com/) to deploy Lambdas, and [Webpack](https://webpack.github.io/) to build them. I needed to get
the binary file included in the zipped Lambda file and I needed it to have execute permissions. I installed three npm packages to do this, all as dev dependencies: [on-build-webpack](https://www.npmjs.com/package/on-build-webpack), [copy-webpack-plugin](https://www.npmjs.com/package/copy-webpack-plugin), and [chmod](https://www.npmjs.com/package/chmod). I then altered my webpack build file so the plugin section looked like this:

```js
// necessary imports at the top of this build file
const CopyWebpackPlugin = require('copy-webpack-plugin');
const WebpackOnBuildPlugin = require('on-build-webpack');
const chmod = require('chmod');


   ...

   plugins: [
       new CopyWebpackPlugin([
           { from: './bin/phantomjs' }
       ]),
       new WebpackOnBuildPlugin(() => {
           chmod('.webpack/phantomjs', 777);
       })
   ]
};
```

Note: _.webpack_ is the intermediary directory that webpack uses when building the Lambda.

The _copy-webpack-plugin_ is configured here to copy the phantomjs file into the root directory of the Lambda. In the Lambda handler that uses it, the _node-horseman_ package needs to be told where that file is:

```js
const PHANTOMJS_BIN_PATH = path.resolve(
  process.env.LAMBDA_TASK_ROOT,
  "phantomjs"
);
const horseman = new Horseman({ phantomPath: PHANTOMJS_BIN_PATH });
```

`LAMBDA_TASK_ROOT` is one of the automatically configured Lambda environment variables.

You could check that the created Lambda zip file contains the PhantomJS binary file and that it has the correct permissions; they should be `-rwxrwxrwx`.

## Deployment

Because of the presence of the phantomjs binary file, your zipped Lambda file will be quite large (~20 MB). If you are on a bad connection, you will want to increase the AWS CLI timeout. This can be done with serverless by executing the following deploy command:

```
AWS_CLIENT_TIMEOUT=900000 sls deploy
```

You should now be able to run Horseman in AWS Lambda.
