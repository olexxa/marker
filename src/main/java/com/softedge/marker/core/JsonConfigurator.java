package com.softedge.marker.core;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.MapperFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import org.jetbrains.annotations.NotNull;

import javax.ws.rs.ext.ContextResolver;
import javax.ws.rs.ext.Provider;

/**
 * Configure JSON serialization.
 *
 * Only called if natural() mapping is used, e.g.
 * JSONConfiguration.FEATURE_POJO_MAPPING is set in the @see JerseyServer class
 *
 * @author <a href="mailto:me@olexxa.com">Alexey Adamov</a>
 */
@Provider
public class JsonConfigurator implements ContextResolver<ObjectMapper> {

	private static ObjectMapper mapper;

	@Override
	public ObjectMapper getContext(Class<?> type) {
		return mapper();
	}

	public static ObjectMapper mapper() {
		if (mapper == null)
			mapper = createMapper();
		return mapper;
	}

	@NotNull
	private static ObjectMapper createMapper() {
		ObjectMapper mapper = new ObjectMapper();
//		mapper.configure(MapperFeature.ALLOW_COMMENTS, true);

		mapper.configure(MapperFeature.USE_ANNOTATIONS, true);
        mapper.configure(MapperFeature.REQUIRE_SETTERS_FOR_GETTERS, false);

        mapper.configure(DeserializationFeature.UNWRAP_ROOT_VALUE, false);
        mapper.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

        mapper.configure(SerializationFeature.WRAP_ROOT_VALUE, false);
        mapper.configure(SerializationFeature.INDENT_OUTPUT, true);

		mapper.setSerializationInclusion(JsonInclude.Include.NON_NULL);

		return mapper;
	}

}
