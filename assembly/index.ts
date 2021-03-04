import { Request,  Response, Headers, URL, Fastly } from "@fastly/as-compute";

// The name of a backend server associated with this service.
//
// This should be changed to match the name of your own backend. See the the
// `Hosts` section of the Fastly Wasm service UI for more information.
const BACKEND_NAME = "backend_name";

/// The name of a second backend associated with this service.
const OTHER_BACKEND_NAME = "other_backend_name";

// The entry point for your application.
//
// Use this function to define your main request handling logic. It could be
// used to route based on the request properties (such as method or path), send
// the request to a backend, make completely new requests, and/or generate
// synthetic responses.
function main(req: Request): Response {
    // Make any desired changes to the client request.
    req.headers.set("Host", "example.com");

    // We can filter requests that have unexpected methods.
    const VALID_METHODS = ["HEAD", "GET", "POST"];
    if (!VALID_METHODS.includes(req.method)) {
        return new Response(String.UTF8.encode("This method is not allowed"), {
            status: 405,
            headers: null,
            url: null
        });
    }

    let method = req.method;
    let url = new URL(req.url);

    // If request is a `GET` to the `/` path, send a default response.
    if (method == "GET" && url.pathname == "/") {
        let headers = new Headers();
        headers.set('Content-Type', 'text/html; charset=utf-8');
        return new Response(String.UTF8.encode("<iframe src='https://developer.fastly.com/compute-welcome' style='border:0; position: absolute; top: 0; left: 0; width: 100%; height: 100%'></iframe>\n"), {
          status: 200,
          headers
        });
    }

    // If request is a `GET` to the `/backend` path, send to a named backend.
    if (method == "GET" && url.pathname == "/backend") {
        // Request handling logic could go here...
        // E.g., send the request to an origin backend and then cache the
        // response for one minute.
        let cacheOverride = new Fastly.CacheOverride();
        cacheOverride.setTTL(60);
        return Fastly.fetch(req, {
            backend: BACKEND_NAME,
            cacheOverride,
        }).wait();
    }

    // If request is a `GET` to a path starting with `/other/`.
    if (method == "GET" && url.pathname.startsWith("/other/")) {
        // Send request to a different backend and don't cache response.
        let cacheOverride = new Fastly.CacheOverride();
        cacheOverride.setPass();
        return Fastly.fetch(req, {
            backend: OTHER_BACKEND_NAME,
            cacheOverride,
        }).wait();
    }

    // Catch all other requests and return a 404.
    return new Response(String.UTF8.encode("The page you requested could not be found"), {
        status: 404,
        headers: null,
        url: null
    });
}

// Get the request from the client.
let req = Fastly.getClientRequest();

// Pass the request to the main request handler function.
let resp = main(req);

// Send the response back to the client.
Fastly.respondWith(resp);
