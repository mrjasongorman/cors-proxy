blacklist = [ ]; // blacklisted origins
whitelist = [ "http://localhost:8080", "https://myfeedrss.netlify.app" ]; // whitelisted origins

const isListed = (uri, listing) => {
    let result = false;
    if (typeof uri == "string") {
        listing.forEach(item => {
	        if (uri === item) result = true;
        });
    } else {
    	result = false; // true accepts null origins false rejects them.
    }
    return result;
}

addEventListener("fetch", async event => {
    event.respondWith((async function() {
        const proxy_url = new URL(event.request.url);
        const fetchOrigin = event.request.headers.get("Origin");

        // Check header origin
        if ((!isListed(fetchOrigin, blacklist)) && (isListed(fetchOrigin, whitelist))) {
            
            // Get URL to consume
            const fetch_url = decodeURIComponent(proxy_url.search.substr(1));
            
            if(fetch_url === '') {
                return new Response(
                    "Not Found",
                    {
                        status: 404,
                        statusText: 'Not Found',
                        headers: {
                            "Content-Type": "text/plain"
                        }
                    }
                );
            }

            // Fetch and add CORS header
            const response = await fetch(fetch_url);
            let myHeaders = new Headers(response.headers);
            myHeaders.set("Access-Control-Allow-Origin", fetchOrigin);

            const body = await response.arrayBuffer();

            const newHeaders = {
                headers: myHeaders,
                status: response.status,
                statusText: response.statusText
            };

            return new Response(body, newHeaders);

        } else {

            return new Response(
                "Forbidden",
                {
                    status: 403,
                    statusText: 'Forbidden',
                    headers: {
                        "Content-Type": "text/plain"
                    }
                }
            );

        }
    })());
});
