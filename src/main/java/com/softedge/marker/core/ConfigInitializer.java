package com.softedge.marker.core;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.log4j.Logger;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

import java.io.*;
import java.util.HashMap;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Read config files in JSON format
 *
 * @author <a href="mailto:me@olexxa.com">Alexey Adamov</a>
 */
public class ConfigInitializer implements Initializer<Config> {

	private static final Logger log = Logger.getLogger(ConfigInitializer.class);

	private static final String EMPTY_JSON_OBJECT = "{}";
	private static final Pattern multiLined = Pattern.compile("\\\\$");

	private final String configDir;
	private final HashMap<Class<? extends Config>, Config> configs = new HashMap<>();

	public ConfigInitializer() {
		this(null);
	}

	public ConfigInitializer(@Nullable String configDir) {
		this.configDir = configDir;
	}

	@SuppressWarnings("unchecked")
    public <T extends Config> T config(@NotNull Class<T> probe) {
		return (T) configs.get(probe);
	}

	@Override
	public void initialize(
		@NotNull Set<Class<? extends Config>> types
	) {
		log.debug("Configs: ");
		for (Class<? extends Config> type: types) {
			log.debug("loading " + type);
			Config config = load(type);
			configs.put(type, config);
		}
	}

	@NotNull
    protected <T extends Config> T load(@NotNull Class<T> type) {
		String configFile = getPath(type);
		String json = readFile(configFile);
		return create(json, type);
	}

	@NotNull
	private String getPath(@NotNull Class<? extends Config> type) {
		Configuration config = type.getAnnotation(Configuration.class);
		if (config == null)
			throw new IllegalArgumentException("Configuration must be annotated as @Configuration('filename'): " + type);

		if (config.value() == null || config.value().isEmpty())
			throw new IllegalArgumentException("Filename must be specified in @Configuration: " + type);

		return config.value();
	}

	@NotNull
	private String readFile(@NotNull String configFile) {
		try (
			InputStream is = findStream(configFile)
		) {
			if (is == null)
				return EMPTY_JSON_OBJECT;

			BufferedReader reader = new BufferedReader(new InputStreamReader(is));
			StringBuilder builder = new StringBuilder();
			while (reader.ready()) {
				String line = reader.readLine();
				// allow bash-style multiLined strings
				line = multiLined.matcher(line).replaceAll("");
                line = line.replaceAll("'", "\"");

				builder = builder.append(line).append(" ");
			}
			return builder.toString();
		} catch (IOException error) {
			String message = String.format("Can't read config file '%s'", configFile);
			log.fatal(message);
			log.fatal(error.getMessage());
			throw new IllegalArgumentException(message);
		}
	}

	private InputStream findStream(@NotNull String configFile) {
		// trying classpath
		ClassLoader classLoader = Thread.currentThread().getContextClassLoader();
		InputStream is = classLoader.getResourceAsStream(configFile);
		if (is != null || configDir == null)
			return is;

		// trying file
		String path = configDir + File.separator + configFile;
		File file = new File(path);
		if (!file.exists() || !file.canRead()) {
			log.warn("  no config found: " + path);
			return null;
		}
		try {
			is = new FileInputStream(file);
		} catch (FileNotFoundException error) {
			// file deleted after file.exists() check above
			log.warn("  config file might have just been deleted: " + path);
			return null;
		}

		return is;
	}

	@NotNull
	private <T extends Config> T create(
		@NotNull String json, @NotNull Class<T> type
	) {
		try {
			ObjectMapper mapper = JsonConfigurator.mapper();
			//log.debug("  " + type + "\n  " + json);
			T config = mapper.readValue(json, type);
			log.debug("  " + type.getName());
			log.debug("    [ " + config + " ] ");
			return config;
		} catch (IOException error) {
			log.fatal("Can't create " + type + "\n   from json: '" + json + "'");
			log.fatal(error.getMessage());
			throw new IllegalArgumentException(error);
		}
	}

}
