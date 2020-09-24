class Comments extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    if (!this.isConnected) {
      return;
    }

    this._intersectionObserver = new IntersectionObserver(
      ([intersection]) => {
        if (!intersection.isIntersecting) {
          return;
        }
        this._intersectionObserver.disconnect();
        delete this._intersectionObserver;

        const container = document.createElement("div");
        this.shadowRoot.appendChild(container);

        const style = document.createElement("style");
        style.textContent = `
        ul {
          margin: 0;
          padding-left: 0;
          list-style: none;
        }
        address {
         display: inline;
        }
        a {
          color: var(--octomments-link-color);
        }
        li p:first-of-type {
          font-size: 0.875em;
          font-style: italic;
          color: var(--octomments-meta-color);
        }
        li + li {
          border-top: 1px dashed var(--octomments-divider-color);
        }`;
        this.shadowRoot.appendChild(style);

        const script = document.createElement("script");
        script.src = "/js/ocs-core.min.1-0-4.js";
        script.id = "ocs-core.min.js";

        script.onload = () => {
          const renderer = (api) => {
            api.on(Octomments.COMMENTS_LOADED, (comments) => {
              container.innerHTML = "";

              if (comments.length === 0) {
                const p = document.createElement("p");
                p.innerText =
                  "No comments found. Be the first to post a comment!";
                container.appendChild(p);
                return;
              }

              const ul = document.createElement("ul");
              comments.forEach((comment) => {
                const li = document.createElement("li");
                li.innerHTML = comment.body;

                const meta = document.createElement("p");
                const createdAt = new Date(comment.createdAt);
                meta.innerHTML = `<address class="author">Posted by <a rel="author" href="${
                  comment.author.url
                }">${
                  comment.author.login
                }</a></address> on <time pubdate datetime="${
                  comment.createdAt
                }" title="${createdAt.toLocaleString()}">${createdAt.toLocaleDateString()}</time> &mdash;`;
                li.prepend(meta);

                ul.appendChild(li);
              });
              container.appendChild(ul);
            });

            api.on(Octomments.ERROR, (error) => {
              console.error(error);
              container.innerHTML = "";
              const p = document.createElement("p");
              p.innerText = "Failed to load comments for this post.";
              container.appendChild(p);
            });
          };

          Octomments({
            github: {
              owner: this.getAttribute("data-owner"),
              repo: this.getAttribute("data-repo"),
            },
            issueNumber: parseInt(this.getAttribute("data-issue-number"), 10),
            renderer: [renderer, ""],
            debug: false,
            endpoints: {
              issue: this.getAttribute("data-issue-endpoint"),
              token: "",
            },
          }).init();
        };
        this.shadowRoot.appendChild(script);
      },
      { rootMargin: "200px 0px 0px 0px" }
    );
    this._intersectionObserver.observe(this);
  }

  disconnectedCallback() {
    if (this._intersectionObserver) {
      this._intersectionObserver.disconnect();
      delete this._intersectionObserver;
    }
  }
}

customElements.define("comments-list", Comments);
