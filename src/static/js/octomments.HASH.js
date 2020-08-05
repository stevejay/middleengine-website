document.getElementById("comments-list").innerHTML = "";
Octomments({
  github: {
    owner: "stevejay",
    repo: "middleengine-website",
  },
  issueNumber: parseInt(
    document
      .querySelector('meta[itemprop="issueNumber"]')
      .getAttribute("content") || null
  ),
  renderer: [OctommentsRenderer, "#comments-list"],
  debug: false,
  endpoints: {
    issue: "https://middleengine-website-comments.vercel.app/octomments/issue",
    token: "https://middleengine-website-comments.vercel.app/octomments/token",
  },
}).init();
