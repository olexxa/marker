package com.softedge.marker;

import com.softedge.marker.app.MarkerApp;
import com.softedge.marker.core.JerseyServer;
import com.softedge.marker.core.ServerRunner;
import org.apache.log4j.BasicConfigurator;
import org.apache.log4j.Level;
import org.apache.log4j.Logger;
import org.opencv.core.Core;

public class Marker {

    private static final Logger log = Logger.getLogger(Marker.class);

    private static final String
        key_HOME = "home",
        key_HOSTNAME = "hostname";

    public static String home, hostname;

    private static void initLogging() {
        BasicConfigurator.configure();
        Logger.getRootLogger().setLevel(Level.DEBUG);
//        Logger.getRootLogger().setLevel(Level.INFO);
//        Logger.getLogger("com.softedge").setLevel(Level.DEBUG);
    }

    private static void readConfig() {
        home = System.getProperty(key_HOME);
        if (home == null) {
            log.fatal("Please specify -Dhome=<path>");
            System.exit(-1);
        }
        hostname = System.getProperty(key_HOSTNAME, "localhost");
    }

    private static void reinitLogging() {
    }

    private static void loadLibraries() {
        System.loadLibrary(Core.NATIVE_LIBRARY_NAME);
    }

    private static void startServer() {
        JerseyServer server = new JerseyServer("marker", MarkerApp.class);
        new ServerRunner(server).startup();
    }

    public static void main(String[] args) {
        initLogging();
        readConfig();
        reinitLogging();
        loadLibraries();
        startServer();
    }

}
