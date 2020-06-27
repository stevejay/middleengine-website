import path from "path";
import fs from "fs-extra";
import probeImageSize from "probe-image-size";

const localImageRegExp = /^\/images\//;
const pixelDensityRegExp = /-(\d)x\.[^.]+$/;

/*
POST IMAGES plug-in

This markdown-it plug-in generates custom HTML for images in the markdown file.

The plug-in:
- Wraps the image in a figure element.
- Wraps the image title in a figcaption element.
- Generates a responsive image wrapper around the image (one that uses
    the percentage padding-bottom technique).
*/

const postImages = (md, opts) => {
  opts = Object.assign({}, postImages.defaults, opts);

  // Remember the old renderer, if overridden, or proxy to the default renderer
  const defaultRender =
    md.renderer.rules.image ||
    ((tokens, idx, options, env, self) =>
      self.renderToken(tokens, idx, options, env, self));

  md.renderer.rules.image = (tokens, idx, options, env, self) => {
    const imageToken = tokens[idx];
    const srcAttrIndex = imageToken.attrIndex("src");
    const hasSrcAttr = srcAttrIndex !== -1;

    if (!hasSrcAttr) {
      return defaultRender(tokens, idx, options, env, self);
    }

    const src = imageToken.attrs[srcAttrIndex][1];
    const isLocalImage = !!src.match(localImageRegExp);

    if (!isLocalImage) {
      return defaultRender(tokens, idx, options, env, self);
    }

    const titleAttrIndex = imageToken.attrIndex("title");
    const title =
      titleAttrIndex > -1 ? imageToken.attrs[titleAttrIndex][1] : null;

    const alt = imageToken.content || "";

    const imagePath = path.join(opts.imageRootPath, src);
    const imageContent = fs.readFileSync(imagePath);
    const imageSize = probeImageSize.sync(imageContent);

    const pixelDensityMatch = src.match(pixelDensityRegExp);
    const pixelDensity = pixelDensityMatch ? pixelDensityMatch[1] : 1;

    const imageWidth = imageSize.width / pixelDensity;
    const imageHeight = imageSize.height / pixelDensity;
    const imageRatio = (100 / imageWidth) * imageHeight;

    return (
      `<figure class="article-image">` +
      `  <div style="max-width: ${imageWidth}px; margin-left: auto; margin-right: auto;">` +
      `    <div style="width: 100%; height: 0; padding-bottom: ${imageRatio}%;">` +
      `      <img src="${src}" alt="${alt}" loading="lazy" style="width: 100%;">` +
      `    </div>` +
      `  </div>` +
      (title ? `  <figcaption>${title}</figcaption>` : "") +
      `</figure>`
    );
  };
};

postImages.defaults = {
  level: 1,
  imageRootPath: "./src",
};

export default postImages;
