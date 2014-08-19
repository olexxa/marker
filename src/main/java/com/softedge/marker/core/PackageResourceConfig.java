package com.softedge.marker.core;

import org.apache.log4j.Logger;
import org.glassfish.jersey.server.ResourceConfig;
import org.jetbrains.annotations.NotNull;

import java.util.HashSet;
import java.util.Set;

/**
 * This class is the resource config for jersey, which takes
 * classes and uses their FQNs.
 *
 * @author <a href="mailto:me@olexxa.com">Alexey Adamov</a>
 */
public class PackageResourceConfig extends ResourceConfig {

	private static final Logger log = Logger.getLogger(PackageResourceConfig.class);

	final Set<Package> roots;

	public PackageResourceConfig(@NotNull Class... rootTags) {
		log.debug("Set application roots");
		roots = new HashSet<>();

		StringBuilder builder = new StringBuilder();
		for (Class rootTag: rootTags) {
			Package root = rootTag.getPackage();
			roots.add(root);

			if (builder.length() > 0)
				builder.append(";");
			builder.append(root.getName());

			log.debug("  " + root.getName());
		}

		packages(builder.toString());
	}

}