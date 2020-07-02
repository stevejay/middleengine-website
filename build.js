const _ = require("lodash");
const minimist = require("minimist");
const mimetype = require("mimetype");
const Graceful = require("node-graceful");
const chokidar = require("chokidar");
const express = require("express");
const http = require("http");
const reload = require("reload");
const getPort = require("get-port");
const fsWalk = require("@nodelib/fs.walk");
const util = require("util");
const fs = require("fs-extra");
const path = require("path");
const MarkdownIt = require("markdown-it");
const markdownItMeta = require("markdown-it-meta");
const markdownItAttribution = require("markdown-it-attribution");
const markdownItContainer = require("markdown-it-container");
const markdownItPrism = require("markdown-it-prism");
const markdownItPrismBackticks = require("markdown-it-prism-backticks");
const markdownItAnchor = require("markdown-it-anchor");
const markdownItAttrs = require("markdown-it-attrs");
const markdownItMultimdTable = require("markdown-it-multimd-table");
const Handlebars = require("handlebars");
const HandlebarsIntl = require("handlebars-intl");
const revisionHash = require("rev-hash");
const dotenv = require("dotenv");
const fetch = require("node-fetch");
const postcss = require("postcss");
const postCssImport = require("postcss-import");
const postCssCssVariables = require("postcss-css-variables");
const postCssPresetEnv = require("postcss-preset-env");
const postCssAutoprefixer = require("autoprefixer");
const postCssCssNano = require("cssnano");
const markdownItResponsiveImages = require("./markdown-it-plugins/responsive-images.js");

Graceful.captureExceptions = true;
Graceful.captureRejections = true;
global.fetch = fetch;
dotenv.config();

const walk = util.promisify(fsWalk.walk);
const ensureDir = util.promisify(fs.ensureDir);
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);
const copyFile = util.promisify(fs.copyFile);

const DOMAIN = "https://www.middle-engine.com";
const LATEST_POSTS_LENGTH = 6;
const BUILD_DIR = "./build";
const EXCLUDED_STATIC_FILES = [".DS_Store"];
const POSTCSS_FILE_EXTENSIONS = [".css"];
const SRC_DIR = "./src";
const STATIC_SRC_DIR = "./src/static";
const POSTS_SRC_DIR = "./src/posts";
const TEMPLATES_SRC_DIR = "./src/templates";
const PARTIALS_SRC_DIR = path.join(SRC_DIR, "templates");
const POST_NAME_REGEXP = /^(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})-(?<name>.+)$/;
const WATCH_DEBOUNCE_MS = 500;

HandlebarsIntl.registerWith(Handlebars);

const handlebarsI18nData = {
  locales: "en-GB",
  formats: {
    date: {
      short: {
        day: "numeric",
        month: "long",
        year: "numeric",
      },
    },
  },
};

const processBlogPostFile = async (blogPostFile, buildContext) => {
  // A new MarkdownIt instance needs to be created for each post
  // as posts are processed concurrently and the instance is not
  // safe to share in that situation.
  const markdownIt = new MarkdownIt({ html: true, linkify: false })
    .use(markdownItPrism)
    .use(markdownItPrismBackticks)
    .use(markdownItMeta)
    .use(markdownItAnchor, {
      level: [1, 2, 3, 4],
      permalink: true,
      permalinkClass: "header-anchor",
      permalinkSymbol: "#",
      permalinkBefore: true,
    })
    .use(markdownItAttribution, { removeMarker: false })
    .use(markdownItResponsiveImages)
    .use(markdownItMultimdTable, {
      multiline: false,
      rowspan: false,
      headerless: false,
    })
    .use(markdownItAttrs)
    .use(markdownItContainer, "div", {
      validate: (params) => params.trim().match(/^opcode$/),
      render: (tokens, idx) =>
        tokens[idx].nesting === 1
          ? '<section class="opcode-detail">\n'
          : "</section>\n",
    });

  const post = await readFile(blogPostFile.path, { encoding: "utf-8" });
  const content = markdownIt.render(post);

  // TODO could have a build-time template cache.
  const layoutContent = await readFile(
    path.join(TEMPLATES_SRC_DIR, `${markdownIt.meta.layout}.hbs`),
    {
      encoding: "utf-8",
    }
  );
  const template = Handlebars.compile(layoutContent);

  const context = { ...buildContext, ...markdownIt.meta, content };
  const options = { data: { intl: handlebarsI18nData } };
  const html = template(context, options);
  const fileName = path.parse(blogPostFile.path).name;

  const srcPathParts = fileName.match(POST_NAME_REGEXP);
  if (!srcPathParts) {
    throw new Error(
      `Blog post file name does not match the expected format: ${fileName}`
    );
  }

  const buildPostDir = createPostDirectoryPath(markdownIt.meta.date);
  const buildPostName = srcPathParts.groups.name;
  const urlPath = `/blog/posts/${buildPostDir}/${buildPostName}`;
  const filePath = `${urlPath}.html`;

  if (markdownIt.meta.draft) {
    console.log("Draft blog post", `http://127.0.0.1:8001${urlPath}`);
  }

  return {
    key: urlPath,
    srcFile: blogPostFile.path,
    src: html,
    filePath,
    urlPath,
    meta: markdownIt.meta,
  };
};

const createPostDirectoryPath = (postDate) =>
  `${postDate.getUTCFullYear()}/${_.padStart(
    postDate.getUTCMonth() + 1,
    2,
    "0"
  )}/${_.padStart(postDate.getUTCDate(), 2, "0")}`;

const generateHTMLFile = async (buildContext, templateFileName, urlPath) => {
  const srcFile = path.join(TEMPLATES_SRC_DIR, templateFileName);
  const layoutContent = await readFile(srcFile, { encoding: "utf-8" });
  const template = Handlebars.compile(layoutContent);
  const options = { data: { intl: handlebarsI18nData } };
  const html = template(buildContext, options);
  const filePath = urlPath.endsWith("/")
    ? `${urlPath}index.html`
    : `${urlPath}.html`;

  buildContext.outputFiles.push({
    key: urlPath,
    srcFile: `./${srcFile}`,
    src: html,
    filePath,
    urlPath,
  });
};

const generateSitemapFile = async (buildContext) => {
  const sitemapEntries = [`${DOMAIN}/`, `${DOMAIN}/blog`];

  buildContext.publishedBlogPosts.forEach((postData) => {
    sitemapEntries.push(`${DOMAIN}${postData.urlPath}`);
  });

  buildContext.outputFiles.push({
    key: "/sitemap.txt",
    src: sitemapEntries.join("\n"),
    filePath: "/sitemap.txt",
    urlPath: "/sitemap.txt",
  });
};

const autoRegisterPartial = async (partialFile) => {
  const partialContent = await readFile(partialFile.path, {
    encoding: "utf-8",
  });

  let fileName = path.parse(partialFile.path).name;
  if (fileName.startsWith("_")) {
    fileName = fileName.substring(1);
  }

  Handlebars.registerPartial(fileName, partialContent);
};

const autoRegisterAllPartials = async () => {
  const partialFiles = await walk(PARTIALS_SRC_DIR, {
    entryFilter: (node) =>
      node.dirent.isFile() &&
      node.name.startsWith("_") &&
      node.name.endsWith(".hbs"),
    stats: true,
  });

  await Promise.all(partialFiles.map(autoRegisterPartial));
};

const processStaticFile = async (staticFile, buildContext) => {
  const pathMatch = staticFile.path.match(
    /^(?<base>.+?)(?<flags>\.HASH)?(?<extension>\.[^\.]+)$/
  );

  if (!pathMatch) {
    throw new Error(
      `Static file processor failed to match path parts for file '${staticFile.path}'`
    );
  }

  const base = pathMatch.groups["base"];
  const flags = pathMatch.groups["flags"];
  const extension = pathMatch.groups["extension"];

  const result = {
    key: `/${path.relative(STATIC_SRC_DIR, staticFile.path)}`,
    srcFile: staticFile.path,
    filePath: `/${path.relative(STATIC_SRC_DIR, staticFile.path)}`,
    urlPath: `/${path.relative(STATIC_SRC_DIR, staticFile.path)}`,
  };

  if (POSTCSS_FILE_EXTENSIONS.includes(extension)) {
    const content = fs.readFileSync(staticFile.path);
    const processedCSS = await postcss([
      postCssImport(),
      postCssCssVariables(),
      postCssPresetEnv({ stage: 0 }),
      postCssAutoprefixer(),
      postCssCssNano(),
    ]).process(content, { from: staticFile.path, to: staticFile.path });
    result.src = processedCSS.css;
  }

  // Only generate hashes if not in watch mode - there's no point
  // doing this work in watch mode.
  if (!buildContext.watchMode && flags && flags === ".HASH") {
    if (!result.src) {
      result.src = fs.readFileSync(result.srcFile);
    }
    const contentHash = revisionHash(result.src);
    result.filePath = `/${path.relative(
      STATIC_SRC_DIR,
      `${base}.${contentHash}${extension}`
    )}`;
    result.urlPath = `/${path.relative(
      STATIC_SRC_DIR,
      `${base}.${contentHash}${extension}`
    )}`;
  }

  return result;
};

const processStaticFilesDirectory = async (buildContext) => {
  const staticFiles = await walk(STATIC_SRC_DIR, {
    entryFilter: (node) =>
      node.dirent.isFile() && !EXCLUDED_STATIC_FILES.includes(node.name),
  });

  const promises = staticFiles.map((staticFile) =>
    processStaticFile(staticFile, buildContext)
  );
  const results = await Promise.all(promises);

  results.forEach((result) => {
    buildContext.outputFiles.push(result);
  });
};

const generateBlogPostHTMLFiles = async (buildContext) => {
  const blogPostFiles = await walk(POSTS_SRC_DIR, {
    entryFilter: (node) => node.dirent.isFile() && node.name.endsWith(".md"),
    stats: true,
  });

  const results = await Promise.all(
    blogPostFiles.map((blogPostFile) =>
      processBlogPostFile(blogPostFile, buildContext)
    )
  );

  const publishedBlogPosts = _.chain(results)
    .filter((result) => !result.meta.draft)
    .orderBy(["meta.date", "meta.title"], ["desc", "asc"])
    .value();

  buildContext.publishedBlogPosts = publishedBlogPosts;
  buildContext.latestBlogPosts = publishedBlogPosts.slice(
    0,
    LATEST_POSTS_LENGTH
  );
  buildContext.olderBlogPosts = publishedBlogPosts.slice(LATEST_POSTS_LENGTH);

  results.forEach((result) => {
    buildContext.outputFiles.push(result);
  });
};

const outputBuildFiles = async (buildContext) => {
  await fs.emptyDir(BUILD_DIR);

  for (var i = 0; i < buildContext.outputFiles.length; ++i) {
    const outputFile = buildContext.outputFiles[i];
    const filePath = path.join(BUILD_DIR, outputFile.filePath);
    await ensureDir(path.dirname(filePath));

    if (outputFile.src) {
      await writeFile(filePath, outputFile.src, { encoding: "utf-8" });
    } else if (outputFile.srcFile) {
      await copyFile(outputFile.srcFile, filePath);
    }
  }
};

const generateBuildContext = async (watchMode) => {
  await autoRegisterAllPartials();

  const buildContext = {
    publishedBlogPosts: [],
    latestBlogPosts: [],
    olderBlogPosts: [],
    outputFiles: [],
    watchMode,
  };

  await processStaticFilesDirectory(buildContext);

  Handlebars.registerHelper("staticFile", (key) => {
    const index = buildContext.outputFiles.findIndex((x) => x.key === key);
    if (index === -1) {
      throw new Error(`Could not find static file for key '${key}'.`);
    }
    return buildContext.outputFiles[index].urlPath;
  });

  await generateBlogPostHTMLFiles(buildContext);
  await generateHTMLFile(buildContext, "index.html.hbs", "/");
  await generateHTMLFile(buildContext, "blog.hbs", "/blog");
  await generateHTMLFile(buildContext, "legal.hbs", "/legal");
  await generateHTMLFile(buildContext, "privacy.hbs", "/privacy");
  await generateSitemapFile(buildContext);

  console.log("Built build context");
  return buildContext;
};

void (async () => {
  const argv = minimist(process.argv.slice(2));

  if (argv.watch) {
    let buildContext = null;
    const port = await getPort({ port: [3000, 3001, 3002] });
    const app = express();
    app.set("port", port);

    app.get("*", (req, res, next) => {
      const urlPath = req.path;

      if (urlPath === "/reload/reload.js") {
        next();
        return;
      }

      if (!buildContext) {
        res.sendStatus(503);
        return;
      }

      const index = buildContext.outputFiles.findIndex(
        (outputFile) => outputFile.urlPath === urlPath
      );

      if (index === -1) {
        res.sendStatus(404);
        return;
      }

      const outputFile = buildContext.outputFiles[index];
      res.type(mimetype.lookup(outputFile.filePath, true, "text/plain"));
      res.set("Cache-Control", "max-age=0");

      if (outputFile.src) {
        res.send(outputFile.src);
      } else {
        const content = fs.readFileSync(
          path.join(STATIC_SRC_DIR, outputFile.filePath)
        );
        res.send(content);
      }
    });

    const server = http.createServer(app);
    const reloadReturned = await reload(app);

    server.listen(app.get("port"), function () {
      console.log(`Site listening at http://localhost:${port}`);
    });

    let buildInProgress = false;
    let buildPending = false;

    const debouncedGenerateBuildContext = _.debounce(async () => {
      try {
        if (buildInProgress) {
          buildPending = true;
        } else {
          do {
            buildInProgress = true;
            buildPending = false;
            buildContext = await generateBuildContext(true);
            reloadReturned.reload();
            buildInProgress = false;
          } while (buildPending);
        }
      } catch (err) {
        console.error(`Build error: ${err.message}`);
      }
    }, WATCH_DEBOUNCE_MS);

    chokidar.watch(SRC_DIR).on("all", async () => {
      debouncedGenerateBuildContext();
    });

    Graceful.on("exit", () => {
      debouncedGenerateBuildContext.cancel();
      console.log("Exiting gracefully");
    });
  } else {
    const buildContext = await generateBuildContext(false);
    await outputBuildFiles(buildContext);
    Graceful.exit(0);
  }
})();
