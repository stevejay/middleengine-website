const issueNumberMetaTag = document.querySelector(
  'meta[itemprop="issueNumber"]'
);
const issueNumber = parseInt(
  issueNumberMetaTag.getAttribute("content") || null
);
Octomments({
  github: {
    owner: "stevejay",
    repo: "middleengine-website",
  },
  issueNumber,
  renderer: [OctommentsRenderer, "#comments-list"],
  debug: false,
  endpoints: {
    issue: "https://middleengine-website-comments.vercel.app/octomments/issue",
    token: "https://middleengine-website-comments.vercel.app/octomments/token",
  },
}).init();
