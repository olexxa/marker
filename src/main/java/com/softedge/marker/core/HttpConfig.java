package com.softedge.marker.core;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

import javax.ws.rs.core.UriBuilder;
import java.net.URI;

/**
 * @author <a href="mailto:me@olexxa.com">Alexey Adamov</a>
 */
@Configuration("http.conf")
public class HttpConfig implements Config {

	private static final String default_HOST = "localhost"; //"178.63.28.53";
	private static final int default_PORT = 8080;

	private final URI listenUri;

	@JsonCreator
	public HttpConfig(
		@JsonProperty("host") @Nullable String host,
		@JsonProperty("port") @Nullable Integer port
	) {
		this(
			host == null? default_HOST : host,
			port == null? default_PORT : port
		);
	}

	public HttpConfig(@NotNull String host, int port) {
		this(
			UriBuilder.fromUri("http://" + host + "/").port(port).build()
		);
	}
	
	public HttpConfig(@NotNull URI listenUri) {
		this.listenUri = listenUri;
	}
	
	@NotNull
	public String host() {
		return listenUri.getHost();
	}
	
	public int port() {
		return listenUri.getPort();
	}
	
	@NotNull 
	public String path() {
		return listenUri.getPath();
	}

	@Override @NotNull
	public String toString() {
		return listenUri.toString();
	}

}
