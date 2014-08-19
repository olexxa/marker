package com.softedge.marker.core;

/**
 * Interface that is used by ServerRunner to start and stop all the server processes,
 * join them, wait until they alive and kill them.
 *
 * @author <a href="mailto:me@olexxa.com">Alexey Adamov</a>
 */
public interface Server {

	boolean start();

	void stop();

}
