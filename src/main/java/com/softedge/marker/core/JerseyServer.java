package com.softedge.marker.core;

import org.apache.log4j.Logger;
import org.glassfish.grizzly.http.server.HttpHandler;
import org.glassfish.grizzly.http.server.HttpServer;
import org.glassfish.grizzly.http.server.NetworkListener;
import org.glassfish.grizzly.http.server.ServerConfiguration;
import org.glassfish.jersey.filter.LoggingFilter;
import org.glassfish.jersey.jackson.JacksonFeature;
import org.glassfish.jersey.media.multipart.MultiPartFeature;
import org.glassfish.jersey.server.ContainerFactory;
import org.glassfish.jersey.server.ResourceConfig;
import org.jetbrains.annotations.NotNull;

public class JerseyServer implements Server {

    private final static Logger log = Logger.getLogger(JerseyServer.class);

    @NotNull
    private final Class[] rootTags;

    @NotNull
    private final String serverName;

    private HttpServer server;

    public JerseyServer(@NotNull String serverName, @NotNull Class... rootTags) {
        log.info("Creating grizzly server '" + serverName + "'");
        this.serverName = serverName;
        this.rootTags = rootTags;
    }

    @Override
    public boolean start() {
        try {
            server = new HttpServer();

            HttpConfig httpConfig = initConfig();
            NetworkListener listener = new NetworkListener(serverName, httpConfig.host(), httpConfig.port());
            server.addListener(listener);
            log.info("  listening " + httpConfig);

            ServerConfiguration config = server.getServerConfiguration();

            HttpHandler jerseyHandler = createJerseyHandler();
            HttpHandler staticHandler = createStaticHandler(jerseyHandler);
            config.addHttpHandler(staticHandler, httpConfig.path() + "/");

            server.start();

            log.debug("Grizzly server started");
            return true;
        } catch (Throwable exception) {
            server = null;
            log.fatal("Can't start server");
            log.fatal(exception);
            return false;
        }
    }

    private HttpConfig initConfig() {
        HttpConfigInitializer initializer = new HttpConfigInitializer();
        return initializer.get();
    }

    private HttpHandler createJerseyHandler() {
        ResourceConfig resourceConfig = new PackageResourceConfig(rootTags)
            .register(LoggingFilter.class)
            .register(JacksonFeature.class)
            .register(MultiPartFeature.class)
        ;

        return ContainerFactory.createContainer(HttpHandler.class, resourceConfig);
    }

    private HttpHandler createStaticHandler(HttpHandler chain) {
        String[] pathes = new String[rootTags.length];
        int i = 0;
        for (Class tag: rootTags)
            pathes[i] = tag.getPackage().getName() + "/";

        return new StaticHandler(chain, Thread.currentThread().getContextClassLoader());//, pathes);
    }

    @Override
    public void stop() {
        if (server != null)
            server.shutdownNow(); // TODO: add graceful shutdown
    }

}
