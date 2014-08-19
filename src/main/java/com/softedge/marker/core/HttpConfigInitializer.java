package com.softedge.marker.core;

import com.softedge.marker.Marker;

/**
 * Usually, this class is not needed.
 * But HttpConfig is needed before container is started,
 * so no injection yet available. So this is a special case.
 *
 * @author <a href="mailto:me@olexxa.com">Alexey Adamov</a>
 */
public class HttpConfigInitializer extends ConfigInitializer {

    public HttpConfigInitializer() {
        super(Marker.home + "/etc/");
    }

    public HttpConfig get() {
		return (HttpConfig) load(HttpConfig.class);
	}

}
