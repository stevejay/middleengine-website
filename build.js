import _ from "lodash";
import fsWalk from "@nodelib/fs.walk";
import util from "util";
import fs from "fs-extra";
import path from "path";
import MarkdownIt from "markdown-it";
import meta from "markdown-it-meta";
import attribution from "markdown-it-attribution";
import highlight from "highlight.js";
import Handlebars from "handlebars";
import HandlebarsIntl from "handlebars-intl";
import anchor from "markdown-it-anchor";
import multimdTable from "markdown-it-multimd-table";
import Unsplash from "unsplash-js";
import revisionHash from "rev-hash";
import dotenv from "dotenv";
import fetch from "node-fetch";
import postImages from "./markdown-it-plugins/post-images.js";

global.fetch = fetch;
dotenv.config();

const walk = util.promisify(fsWalk.walk);
const mkdir = util.promisify(fs.mkdir);
const ensureDir = util.promisify(fs.ensureDir);
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);
const copyFile = util.promisify(fs.copyFile);
const copy = util.promisify(fs.copy);

const BUILD_DIR = "./build";
const CSS_BUILD_DIR = path.join(BUILD_DIR, "css");
const JS_BUILD_DIR = path.join(BUILD_DIR, "js");
const POSTS_BUILD_DIR = path.join(BUILD_DIR, "blog/posts");
const IMAGES_BUILD_DIR = path.join(BUILD_DIR, "images");

const SRC_DIR = "./src";
const CSS_SRC_DIR = path.join(SRC_DIR, "css");
const JS_SRC_DIR = path.join(SRC_DIR, "js");
const POSTS_SRC_DIR = path.join(SRC_DIR, "posts");
const TEMPLATES_SRC_DIR = path.join(SRC_DIR, "templates");
const PARTIALS_SRC_DIR = path.join(SRC_DIR, "templates");
const IMAGES_SRC_DIR = path.join(SRC_DIR, "images");
const FAVICON_SRC_DIR = path.join(SRC_DIR, "favicon");
const POST_NAME_REGEXP = /^(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})-(?<name>.+)$/;

HandlebarsIntl.registerWith(Handlebars);

const highlightJsCallback = (str, lang) => {
  if (lang && highlight.getLanguage(lang)) {
    try {
      return highlight.highlight(lang, str).value;
    } catch (__) {}
  }

  return ""; // use external default escaping
};

const handlebarsIntlData = {
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

const createUnsplashMetaData = async (unsplashImageId) => {
  let photoJson = null;
  let attempts = 1;

  do {
    try {
      const unsplash = new Unsplash.default({
        accessKey: process.env.UNSPLASH_APP_ACCESS_KEY,
      });

      photoJson = await unsplash.photos
        .getPhoto(unsplashImageId)
        .then((res) => res.json());

      if (photoJson.errors && photoJson.errors.length) {
        throw new Error(
          `Unsplash image ID ${unsplashImageId}: ${JSON.stringify(
            photoJson.errors
          )}`
        );
      }
    } catch (err) {
      console.error(err);
      ++attempts;

      if (attempts > 3) {
        throw err;
      } else {
        photoJson = null;
      }
    }
  } while (!photoJson);

  return {
    rawUrl: photoJson.urls.raw,
    width: photoJson.width,
    height: photoJson.height,
    backgroundColor: photoJson.color,
    creditUrl: photoJson.user.links.html,
    creditName: photoJson.user.name,
    appName: process.env.UNSPLASH_APP_NAME,
  };
};

const processPostFile = async (postFile, globalContext) => {
  const md = new MarkdownIt({
    html: true,
    linkify: false,
    highlight: highlightJsCallback,
  })
    .use(meta)
    .use(anchor, {
      level: 1,
      permalink: true,
      permalinkClass: "header-anchor",
      permalinkSymbol: "#",
      permalinkBefore: true,
    })
    .use(attribution, { removeMarker: false })
    .use(postImages)
    .use(multimdTable, {
      multiline: false,
      rowspan: false,
      headerless: false,
    });

  const post = await readFile(postFile.path, { encoding: "utf-8" });
  const content = md.render(post);

  if (md.meta.heroImage) {
    if (md.meta.heroImage.source === "Unsplash") {
      md.meta.heroImage = await createUnsplashMetaData(md.meta.heroImage.id);
    }
  }

  const layoutContent = await readFile(
    path.join(TEMPLATES_SRC_DIR, `${md.meta.layout}.hbs`),
    {
      encoding: "utf-8",
    }
  );

  const template = Handlebars.compile(layoutContent);
  const context = { ...globalContext, ...md.meta, content };
  const options = { data: { intl: handlebarsIntlData } };
  const html = template(context, options);

  const fileName = path.parse(postFile.path).name;

  const srcPathParts = fileName.match(POST_NAME_REGEXP);
  if (!srcPathParts) {
    throw new Error(
      `post file name does not have expected format: ${fileName}`
    );
  }

  const buildPostDir = `${srcPathParts.groups.year}/${srcPathParts.groups.month}/${srcPathParts.groups.day}`;
  await ensureDir(path.join(POSTS_BUILD_DIR, buildPostDir));

  const buildPostName = srcPathParts.groups.name;
  const filePath = path.join(
    POSTS_BUILD_DIR,
    buildPostDir,
    `${buildPostName}.html`
  );
  await writeFile(filePath, html, { encoding: "utf-8" });

  return {
    absPath: `/blog/posts/${buildPostDir}/${buildPostName}`,
    meta: md.meta,
  };
};

const processIndexHtmlFile = async (postsData, globalContext) => {
  const layoutContent = await readFile(
    path.join(TEMPLATES_SRC_DIR, "index.html.hbs"),
    {
      encoding: "utf-8",
    }
  );

  const sortedPostsData = _.orderBy(
    postsData,
    ["meta.date", "meta.title"],
    ["desc", "asc"]
  );

  const template = Handlebars.compile(layoutContent);
  const context = {
    ...globalContext,
    title: "Home",
    latestPosts: sortedPostsData.slice(0, 6),
    olderPosts: sortedPostsData.slice(6),
  };
  const options = { data: { intl: handlebarsIntlData } };
  const html = template(context, options);

  await writeFile(path.join(BUILD_DIR, "index.html"), html, {
    encoding: "utf-8",
  });
};

const processBlogFile = async (postsData, globalContext) => {
  const layoutContent = await readFile(
    path.join(TEMPLATES_SRC_DIR, "blog.hbs"),
    {
      encoding: "utf-8",
    }
  );

  const sortedPostsData = _.orderBy(
    postsData,
    ["meta.date", "meta.title"],
    ["desc", "asc"]
  );

  const template = Handlebars.compile(layoutContent);
  const context = {
    ...globalContext,
    title: "Blog",
    latestPosts: sortedPostsData.slice(0, 6),
    olderPosts: sortedPostsData.slice(6),
  };
  const options = { data: { intl: handlebarsIntlData } };
  const html = template(context, options);

  await writeFile(path.join(BUILD_DIR, "blog.html"), html, {
    encoding: "utf-8",
  });
};

const processLegalFile = async (globalContext) => {
  const layoutContent = await readFile(
    path.join(TEMPLATES_SRC_DIR, "legal.hbs"),
    {
      encoding: "utf-8",
    }
  );

  const template = Handlebars.compile(layoutContent);
  const context = { ...globalContext, title: "Terms & Conditions" };
  const html = template(context);

  await writeFile(path.join(BUILD_DIR, "legal.html"), html, {
    encoding: "utf-8",
  });
};

const processPrivacyFile = async (globalContext) => {
  const layoutContent = await readFile(
    path.join(TEMPLATES_SRC_DIR, "privacy.hbs"),
    {
      encoding: "utf-8",
    }
  );

  const template = Handlebars.compile(layoutContent);
  const context = { ...globalContext, title: "Privacy Policy" };
  const html = template(context);

  await writeFile(path.join(BUILD_DIR, "privacy.html"), html, {
    encoding: "utf-8",
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
    entryFilter: (node) => node.dirent.isFile() && node.name.endsWith(".hbs"),
    stats: true,
  });

  await Promise.all(partialFiles.map(autoRegisterPartial));
};

const prepare = async () => {
  await fs.emptyDir(BUILD_DIR);

  await mkdir(CSS_BUILD_DIR);
  await mkdir(JS_BUILD_DIR);

  await autoRegisterAllPartials();
};

const copyStaticFileWithHashValue = async (srcFilePath, destRelFilePath) => {
  const hash = revisionHash(fs.readFileSync(srcFilePath));
  const fileExt = path.extname(destRelFilePath);
  const destRelFilePathWithHash = `${destRelFilePath.substr(
    0,
    destRelFilePath.length - fileExt.length
  )}-${hash}${fileExt}`;

  await copyFile(srcFilePath, path.join(BUILD_DIR, destRelFilePathWithHash));

  return destRelFilePathWithHash;
};

const copyStaticFiles = async () => {
  await copyFile(
    path.join(SRC_DIR, "robots.txt"),
    path.join(BUILD_DIR, "robots.txt")
  );

  await copy(IMAGES_SRC_DIR, IMAGES_BUILD_DIR, {
    filter: (src) => !src.endsWith(".excalidraw"),
  });

  await copy(FAVICON_SRC_DIR, BUILD_DIR);

  const siteCSS = await copyStaticFileWithHashValue(
    path.join(CSS_SRC_DIR, "site.css"),
    "/css/site.css"
  );

  const highlightCSS = await copyStaticFileWithHashValue(
    "./node_modules/highlight.js/styles/tomorrow.css",
    "/css/highlight.css"
  );

  const normalizeCSS = await copyStaticFileWithHashValue(
    "./node_modules/normalize.css/normalize.css",
    "/css/normalize.css"
  );

  const cookieBannerJS = await copyStaticFileWithHashValue(
    path.join(JS_SRC_DIR, "cookie-banner.js"),
    "/js/cookie-banner.js"
  );

  const turbolinksJS = await copyStaticFileWithHashValue(
    path.join(JS_SRC_DIR, "turbolinks.js"),
    "/js/turbolinks.js"
  );

  return {
    turbolinksJS,
    cookieBannerJS,
    normalizeCSS,
    highlightCSS,
    siteCSS,
  };
};

const generateDynamicFiles = async (staticFiles) => {
  const globalContext = { header: { staticFiles } };

  const postFiles = await walk(POSTS_SRC_DIR, {
    entryFilter: (node) => node.dirent.isFile() && node.name.endsWith(".md"),
    stats: true,
  });

  const postsData = await Promise.all(
    postFiles.map((postFile) => processPostFile(postFile, globalContext))
  );

  await processIndexHtmlFile(postsData, globalContext);
  await processBlogFile(postsData, globalContext);
  await processLegalFile(globalContext);
  await processPrivacyFile(globalContext);
};

// MAIN ENTRY POINT:
void (async () => {
  try {
    await prepare();
    const staticFiles = await copyStaticFiles();
    await generateDynamicFiles(staticFiles);
    console.log("Completed");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
