"use strict";
import loadLanguages from "prismjs/components/index.js";

function loadPrismLang(lang) {
  if (!lang) return undefined;
  let langObject = Prism.languages[lang];
  if (!langObject) {
    loadLanguages(lang);
    langObject = Prism.languages[lang];
    if (!langObject) {
      throw new Error(
        `Could not find language '${lang}' in Prism language cache after loading it. There is probably another Prism global object in existence.`
      );
    }
  }
  return langObject;
}

function backticksHandler(state, silent) {
  var start,
    max,
    marker,
    matchStart,
    matchEnd,
    token,
    pos = state.pos,
    ch = state.src.charCodeAt(pos);

  if (ch !== 0x60 /* ` */) {
    return false;
  }

  start = pos;
  pos++;
  max = state.posMax;

  while (pos < max && state.src.charCodeAt(pos) === 0x60 /* ` */) {
    pos++;
  }

  marker = state.src.slice(start, pos);
  matchStart = matchEnd = pos;

  while ((matchStart = state.src.indexOf("`", matchEnd)) !== -1) {
    matchEnd = matchStart + 1;

    while (matchEnd < max && state.src.charCodeAt(matchEnd) === 0x60 /* ` */) {
      matchEnd++;
    }

    if (matchEnd - matchStart === marker.length) {
      // Look for a lang:

      var possibleLanguage = state.src.slice(matchEnd);
      var languageMatch = possibleLanguage.match(/^{lang=([\w_-]+)}/);
      var language = languageMatch ? languageMatch[1] : null;
      var prismLang = null;

      if (language) {
        matchEnd = matchEnd + languageMatch[0].length;

        prismLang = Prism.languages[language];
        if (!prismLang) {
          prismLang = loadPrismLang(language);
        }
      }

      if (!silent) {
        var content = state.src
          .slice(pos, matchStart)
          .replace(/\n/g, " ")
          .replace(/^ (.+) $/, "$1");

        token = state.push("code_inline_open", "code", 1);
        if (language) {
          token.attrs = [["class", `language-${language}`]];
        }
        token.markup = marker;

        token = state.push("html_block", "", 0);
        token.content = prismLang
          ? Prism.highlight(content, prismLang)
          : state.md.utils.escapeHtml(content);

        token = state.push("code_inline_close", "code", -1);
        token.markup = marker;

        // token         = state.push('code_inline', 'code', 0);
        // token.markup  = marker;
        // token.content = content;
      }
      state.pos = matchEnd;
      return true;
    }
  }

  if (!silent) {
    state.pending += marker;
  }

  state.pos += marker.length;
  return true;
}

function prismBackticksPlugin(md) {
  md.inline.ruler.at("backticks", backticksHandler);
}

export default prismBackticksPlugin;
