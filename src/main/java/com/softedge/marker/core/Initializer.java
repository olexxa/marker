package com.softedge.marker.core;

import org.jetbrains.annotations.NotNull;

import java.util.Set;

/**
 * This interface is passed with set of classes found by scanner
 *
 * @author <a href="mailto:me@olexxa.com">Alexey Adamov</a>
 */
public interface Initializer<T> {

	void initialize(
		@NotNull Set<Class<? extends T>> types
	);

}
