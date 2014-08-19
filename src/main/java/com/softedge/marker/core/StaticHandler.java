package com.softedge.marker.core;

import org.glassfish.grizzly.http.server.CLStaticHttpHandler;
import org.glassfish.grizzly.http.server.HttpHandler;
import org.glassfish.grizzly.http.server.Request;
import org.glassfish.grizzly.http.server.Response;

/**
 * @author <a href="mailto:me@olexxa.com">Alexey Adamov</a>
 */

public class StaticHandler extends CLStaticHttpHandler {

    private final HttpHandler chain;

    public StaticHandler(HttpHandler chain, ClassLoader classLoader, String... docRoots) {
        super(classLoader, docRoots);
        this.chain = chain;
    }

    @Override
    protected boolean handle(
        String resourcePath, final Request request, final Response response
    ) throws Exception {
        return super.handle(resourcePath, request, response);
    }

    protected void onMissingResource(
        final Request request, final Response response
    ) throws Exception {
        chain.service(request, response);
    }
}
