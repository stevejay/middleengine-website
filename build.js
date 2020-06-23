import _ from "lodash";
import fsWalk from "@nodelib/fs.walk";
import util from "util";
import fs from "fs-extra";
import path from "path";
import MarkdownIt from "markdown-it";
import meta from "markdown-it-meta";
import attribution from "markdown-it-attribution";
import Prism from "prismjs";
import loadLanguages from "prismjs/components/index.js";
import Handlebars from "handlebars";
import HandlebarsIntl from "handlebars-intl";
import anchor from "markdown-it-anchor";
import multimdTable from "markdown-it-multimd-table";
import Unsplash from "unsplash-js";
import revisionHash from "rev-hash";
import dotenv from "dotenv";
import fetch from "node-fetch";
import postcss from "postcss";
import cssvariables from "postcss-css-variables";
import responsiveImages from "./markdown-it-plugins/responsive-images.js";

loadLanguages(["asm6502", "ts", "scss", "jsx", "shell"]);

global.fetch = fetch;
dotenv.config();

const walk = util.promisify(fsWalk.walk);
const mkdir = util.promisify(fs.mkdir);
const ensureDir = util.promisify(fs.ensureDir);
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);
const copyFile = util.promisify(fs.copyFile);
const copy = util.promisify(fs.copy);

const DOMAIN = "https://www.middle-engine.com";
const LATEST_POSTS_LENGTH = 6;
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

const getUnsplashImageMetaData = async (unsplashImageId) => {
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
      ++attempts;

      if (attempts > 3) {
        console.error(err);
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

const processBlogPostFile = async (blogPostFile, buildContext) => {
  const markdownIt = new MarkdownIt({
    html: true,
    linkify: false,
    highlight: (text, lang) => {
      const code = Prism.languages[lang]
        ? Prism.highlight(text, Prism.languages[lang])
        : markdownIt.utils.escapeHtml(text);

      const classAttr = lang
        ? ` class="${markdownIt.options.langPrefix}${lang}"`
        : "";

      return `<pre${classAttr}><code${classAttr}>${code}</code></pre>`;
    },
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
    .use(responsiveImages)
    .use(multimdTable, {
      multiline: false,
      rowspan: false,
      headerless: false,
    });

  const post = await readFile(blogPostFile.path, { encoding: "utf-8" });
  const content = markdownIt.render(post);

  if (markdownIt.meta.heroImage) {
    if (markdownIt.meta.heroImage.source === "Unsplash") {
      markdownIt.meta.heroImage = await getUnsplashImageMetaData(
        markdownIt.meta.heroImage.id
      );
    }
  }

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
  await ensureDir(path.join(POSTS_BUILD_DIR, buildPostDir));

  const buildPostName = srcPathParts.groups.name;
  const filePath = path.join(
    POSTS_BUILD_DIR,
    buildPostDir,
    `${buildPostName}.html`
  );
  await writeFile(filePath, html, { encoding: "utf-8" });

  const absPath = `/blog/posts/${buildPostDir}/${buildPostName}`;
  if (markdownIt.meta.draft) {
    console.log("Draft blog post", `http://127.0.0.1:8001/${absPath}`);
  }

  return { absPath, meta: markdownIt.meta };
};

const createPostDirectoryPath = (postDate) =>
  `${postDate.getUTCFullYear()}/${_.padStart(
    postDate.getUTCMonth() + 1,
    2,
    "0"
  )}/${_.padStart(postDate.getUTCDate(), 2, "0")}`;

const createHTMLFile = async (buildContext, templateFileName, destFileName) => {
  const layoutContent = await readFile(
    path.join(TEMPLATES_SRC_DIR, templateFileName),
    {
      encoding: "utf-8",
    }
  );

  const template = Handlebars.compile(layoutContent);
  const options = { data: { intl: handlebarsI18nData } };
  const html = template(buildContext, options);

  await writeFile(path.join(BUILD_DIR, destFileName), html, {
    encoding: "utf-8",
  });
};

const createSitemapFile = async (buildContext) => {
  const sitemapEntries = [`${DOMAIN}/`, `${DOMAIN}/blog`];

  buildContext.publishedBlogPosts.forEach((postData) => {
    sitemapEntries.push(`${DOMAIN}${postData.absPath}`);
  });

  await writeFile(
    path.join(BUILD_DIR, "sitemap.txt"),
    sitemapEntries.join("\n"),
    {
      encoding: "utf-8",
    }
  );
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

const createBuildDirectory = async () => {
  // Create the basic build directory structure
  await fs.emptyDir(BUILD_DIR);
  await mkdir(CSS_BUILD_DIR);
  await mkdir(JS_BUILD_DIR);
};

const addHashToFilePath = (filePath, hash) => {
  const fileExt = path.extname(filePath);

  return `${filePath.substr(
    0,
    filePath.length - fileExt.length
  )}-${hash}${fileExt}`;
};

const copyFileWithAddedHash = async (srcFilePath, destRelFilePath) => {
  const hash = revisionHash(fs.readFileSync(srcFilePath));
  const destRelFilePathWithHash = addHashToFilePath(destRelFilePath, hash);
  await copyFile(srcFilePath, path.join(BUILD_DIR, destRelFilePathWithHash));
  return destRelFilePathWithHash;
};

const copyPostCSSProcessedFile = async (srcFilePath, destRelFilePath) => {
  const content = await readFile(srcFilePath, { encoding: "utf-8" });
  const processedCSS = postcss([cssvariables()]).process(content).css;
  const hash = revisionHash(processedCSS);
  const destRelFilePathWithHash = addHashToFilePath(destRelFilePath, hash);
  await writeFile(path.join(BUILD_DIR, destRelFilePathWithHash), processedCSS, {
    encoding: "utf-8",
  });
  return destRelFilePathWithHash;
};

const generateResourceFiles = async (buildContext) => {
  await copyFile(
    path.join(SRC_DIR, "robots.txt"),
    path.join(BUILD_DIR, "robots.txt")
  );

  await copy(IMAGES_SRC_DIR, IMAGES_BUILD_DIR, {
    filter: (src) => !src.endsWith(".excalidraw"),
  });

  await copy(FAVICON_SRC_DIR, BUILD_DIR);

  const siteCSS = await copyPostCSSProcessedFile(
    path.join(CSS_SRC_DIR, "site.css"),
    "/css/site.css"
  );
  buildContext.head.staticFiles.siteCSS = siteCSS;

  const normalizeCSS = await copyFileWithAddedHash(
    "./node_modules/normalize.css/normalize.css",
    "/css/normalize.css"
  );
  buildContext.head.staticFiles.normalizeCSS = normalizeCSS;

  const cookieBannerJS = await copyFileWithAddedHash(
    path.join(JS_SRC_DIR, "cookie-banner.js"),
    "/js/cookie-banner.js"
  );
  buildContext.head.staticFiles.cookieBannerJS = cookieBannerJS;

  const turbolinksJS = await copyFileWithAddedHash(
    path.join(JS_SRC_DIR, "turbolinks.js"),
    "/js/turbolinks.js"
  );
  buildContext.head.staticFiles.turbolinksJS = turbolinksJS;
};

const generateHTMLFiles = async (buildContext) => {
  await autoRegisterAllPartials();

  const blogPostFiles = await walk(POSTS_SRC_DIR, {
    entryFilter: (node) => node.dirent.isFile() && node.name.endsWith(".md"),
    stats: true,
  });

  const blogPosts = await Promise.all(
    blogPostFiles.map((blogPostFile) =>
      processBlogPostFile(blogPostFile, buildContext)
    )
  );

  const publishedBlogPosts = _.chain(blogPosts)
    .filter((blogPost) => !blogPost.meta.draft)
    .orderBy(["meta.date", "meta.title"], ["desc", "asc"])
    .value();

  buildContext.publishedBlogPosts = publishedBlogPosts;
  buildContext.latestBlogPosts = publishedBlogPosts.slice(
    0,
    LATEST_POSTS_LENGTH
  );
  buildContext.olderBlogPosts = publishedBlogPosts.slice(LATEST_POSTS_LENGTH);

  await createHTMLFile(buildContext, "index.html.hbs", "index.html");
  await createHTMLFile(buildContext, "blog.hbs", "blog.html");
  await createHTMLFile(buildContext, "legal.hbs", "legal.html");
  await createHTMLFile(buildContext, "privacy.hbs", "privacy.html");
  await createSitemapFile(buildContext);
};

// MAIN ENTRY POINT:
void (async () => {
  try {
    const buildContext = {
      head: { staticFiles: {} },
      publishedBlogPosts: [],
      latestBlogPosts: [],
      olderBlogPosts: [],
    };

    await createBuildDirectory();
    await generateResourceFiles(buildContext);
    await generateHTMLFiles(buildContext);
    console.log("Completed");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
