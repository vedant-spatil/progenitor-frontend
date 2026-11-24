/* eslint-disable @typescript-eslint/no-unused-vars -- CloudFront calls handler; it is never imported. */
// CloudFront Function "progenitor-spa" (runtime cloudfront-js-2.0), viewer request, Default (*) behavior only.
// Source of truth: paste this file into the console (backend deploy/PHASE8-SETUP.md B2). The e2e export
// server (scripts/serve-export.mjs) and the unit tests load this same file.
//
// The export (no trailingSlash) writes /app/runs as app/runs.html, with router payloads in app/runs.txt and
// app/runs/__next.*.txt. Dynamic pages exist once, as the "_" placeholder (app/runs/_.html).
function handler(event) {
  var req = event.request;
  var uri = req.uri;
  // /app/(runs|patients|trials)/<id>[/ | .txt | /<payload file>] -> the placeholder; the page reads the id
  // from the URL. Ids (UUIDs, integers, NCT ids) have no dot, so the list pages' own files pass through.
  var m = uri.match(/^\/app\/(runs|patients|trials)\/([^\/.]+)(\.txt|\/.*)?$/);
  if (m && m[2] !== 'new' && m[2] !== '_') {
    var rest = m[3] || '';
    req.uri = '/app/' + m[1] + '/_' + (rest === '' || rest === '/' ? '.html' : rest);
    return req;
  }
  if (uri === '/' || uri === '') {
    req.uri = '/index.html';
    return req;
  }
  // Other pages: /login and /login/ -> /login.html. Paths with an extension are files.
  if (uri.endsWith('/')) {
    uri = uri.slice(0, -1);
  }
  if (uri.split('/').pop().indexOf('.') === -1) {
    uri = uri + '.html';
  }
  req.uri = uri;
  return req;
}
