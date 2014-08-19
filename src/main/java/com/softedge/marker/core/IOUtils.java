package com.softedge.marker.core;

import org.jetbrains.annotations.NotNull;

import java.io.Closeable;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;

/**
 * @author <a href="mailto:me@olexxa.com">Alexey Adamov</a>
 */

public class IOUtils {

    private static final int EOF = -1;

    private static final int DEFAULT_BUFFER_SIZE = 1024 * 4;

    public static void silentlyClose(@NotNull final Closeable... closeables) {
        for (final Closeable closeable: closeables)
            if (closeable != null)
                try {
                    closeable.close();
                } catch (IOException ignore) {
                }
    }

    public static long copy(
        @NotNull final InputStream is, @NotNull final OutputStream os
    ) throws IOException {
        long count = 0;
        int n;
        final byte[] buffer = new byte[DEFAULT_BUFFER_SIZE];
        while (EOF != (n = is.read(buffer))) {
            os.write(buffer, 0, n);
            count += n;
        }
        return count;
    }
}
