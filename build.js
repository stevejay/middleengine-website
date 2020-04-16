import _ from "lodash";
import fsWalk from "@nodelib/fs.walk";
import util from "util";
import fs from "fs-extra";
import path from "path";
import Handlebars from "handlebars";
import HandlebarsIntl from "handlebars-intl";
import revisionHash from "rev-hash";
import dotenv from "dotenv";
import fetch from "node-fetch";

global.fetch = fetch;
dotenv.config();

const walk = util.promisify(fsWalk.walk);
const mkdir = util.promisify(fs.mkdir);
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);
const copyFile = util.promisify(fs.copyFile);
const copy = util.promisify(fs.copy);

const BUILD_DIR = "./build";
const CSS_BUILD_DIR = path.join(BUILD_DIR, "css");
const JS_BUILD_DIR = path.join(BUILD_DIR, "js");
const IMAGES_BUILD_DIR = path.join(BUILD_DIR, "images");

const SRC_DIR = "./src";
const CSS_SRC_DIR = path.join(SRC_DIR, "css");
const JS_SRC_DIR = path.join(SRC_DIR, "js");
const TEMPLATES_SRC_DIR = path.join(SRC_DIR, "templates");
const PARTIALS_SRC_DIR = path.join(SRC_DIR, "templates");
const IMAGES_SRC_DIR = path.join(SRC_DIR, "images");
const FAVICON_SRC_DIR = path.join(SRC_DIR, "favicon");

HandlebarsIntl.registerWith(Handlebars);

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

const processIndexHtmlFile = async (globalContext) => {
  const layoutContent = await readFile(
    path.join(TEMPLATES_SRC_DIR, "index.html.hbs"),
    {
      encoding: "utf-8",
    }
  );

  const template = Handlebars.compile(layoutContent);
  const context = { ...globalContext, title: "Home Page" };
  const options = { data: { intl: handlebarsIntlData } };
  const html = template(context, options);

  await writeFile(path.join(BUILD_DIR, "index.html"), html, {
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
  const context = { ...globalContext, title: "Terms & Privacy Policy" };
  const html = template(context);

  await writeFile(path.join(BUILD_DIR, "legal.html"), html, {
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
    siteCSS,
  };
};

const generateDynamicFiles = async (staticFiles) => {
  const globalContext = { header: { staticFiles } };
  await processIndexHtmlFile(globalContext);
  await processLegalFile(globalContext);
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
